import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periodDays = parseInt(req.query.periodDays as string || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const [
      totalBeneficiaries,
      totalShops,
      activeShops,
      totalTransactions,
      recentPeriodTransactions,
      periodTotalAmount,
      unresolvedComplaints,
      lowStockItems,
      recentActivity
    ] = await Promise.all([
      prisma.beneficiary.count(),
      prisma.rationShop.count(),
      prisma.rationShop.count({ where: { status: 'ACTIVE' } }),
      prisma.distributionTransaction.count(),
      prisma.distributionTransaction.count({
        where: { timestamp: { gte: startDate } }
      }),
      prisma.distributionTransaction.aggregate({
        where: { timestamp: { gte: startDate } },
        _sum: { totalAmount: true }
      }),
      prisma.complaint.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }
      }),
      prisma.stock.findMany({
        where: { quantityAvailable: { lt: 100 } },
        include: { rationShop: true, rationItem: true }
      }),
      prisma.distributionTransaction.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          rationShop: true,
          beneficiary: { include: { user: true } }
        }
      })
    ]);

    const commodityOverview = await prisma.stock.groupBy({
      by: ['rationItemId'],
      _sum: { quantityAvailable: true }
    });

    const items = await prisma.rationItem.findMany();
    const itemMap = new Map(items.map(i => [i.id, i]));

    const commodityStock = commodityOverview.map(c => {
      const item = itemMap.get(c.rationItemId);
      return {
        rationItemId: c.rationItemId,
        name: item?.name || 'Unknown',
        unit: item?.unit || 'KG',
        totalStock: Number(c._sum.quantityAvailable || 0)
      };
    });

    res.json({
      success: true,
      data: {
        totalBeneficiaries,
        totalShops,
        activeShops,
        totalTransactions,
        recentPeriodTransactions,
        periodDays,
        totalRationDistributedAmount: Number(periodTotalAmount._sum.totalAmount || 0),
        unresolvedComplaints,
        lowStockAlertsCount: lowStockItems.length,
        lowStockItems: lowStockItems.map(st => ({
          id: st.id,
          shopName: st.rationShop.shopName,
          shopCode: st.rationShop.shopCode,
          itemName: st.rationItem.name,
          quantityAvailable: Number(st.quantityAvailable),
          unit: st.rationItem.unit
        })),
        commodityStock,
        recentActivity: recentActivity.map(t => ({
          id: t.id,
          transactionRef: t.transactionRef,
          shopName: t.rationShop.shopName,
          beneficiaryName: t.beneficiary.user.name,
          totalAmount: Number(t.totalAmount),
          timestamp: t.timestamp
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// 1. Beneficiary Management
// ----------------------------------------------------------------------
export const getBeneficiaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string || '').trim();
    const category = req.query.category as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.rationCard = { category: category as any };
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { rationCard: { rationCardNumber: { contains: search } } }
      ];
    }

    const [total, beneficiaries] = await Promise.all([
      prisma.beneficiary.count({ where }),
      prisma.beneficiary.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, status: true } },
          rationCard: { include: { rationShop: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      success: true,
      data: beneficiaries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBeneficiaryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, category, familyMembersCount } = req.body;
    const adminUserId = req.user?.userId;

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id },
      include: { rationCard: true, user: true }
    });

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary record not found' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      let updatedCard = beneficiary.rationCard;
      if (status || category || familyMembersCount !== undefined) {
        updatedCard = await tx.rationCard.update({
          where: { id: beneficiary.rationCardId },
          data: {
            ...(status && { status }),
            ...(category && { category }),
            ...(familyMembersCount !== undefined && { familyMembersCount: Number(familyMembersCount) })
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_BENEFICIARY_ELIGIBILITY',
          entityAffected: 'RationCard',
          entityId: beneficiary.rationCardId,
          detailsJson: JSON.stringify({
            beneficiaryId: id,
            rationCardNumber: beneficiary.rationCard.rationCardNumber,
            oldStatus: beneficiary.rationCard.status,
            newStatus: status || beneficiary.rationCard.status,
            oldCategory: beneficiary.rationCard.category,
            newCategory: category || beneficiary.rationCard.category
          })
        }
      });

      return updatedCard;
    });

    res.json({
      success: true,
      message: 'Beneficiary eligibility record updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// 2. Ration Shop & Shopkeeper Assignment Management
// ----------------------------------------------------------------------
export const getAllShops = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shops = await prisma.rationShop.findMany({
      include: {
        shopkeepers: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        stocks: { include: { rationItem: true } },
        _count: { select: { rationCards: true } }
      },
      orderBy: { shopCode: 'asc' }
    });

    res.json({ success: true, data: shops });
  } catch (error) {
    next(error);
  }
};

export const createRationShop = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { shopCode, shopName, address, district, pincode, contactNumber } = req.body;
    const adminUserId = req.user?.userId;

    const existing = await prisma.rationShop.findUnique({ where: { shopCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Shop code '${shopCode}' already exists.` });
    }

    const shop = await prisma.rationShop.create({
      data: { shopCode, shopName, address, district, pincode, contactNumber, status: 'ACTIVE' }
    });

    // Automatically initialize inventory records for all active commodities
    const items = await prisma.rationItem.findMany();
    for (const item of items) {
      await prisma.stock.create({
        data: { rationShopId: shop.id, rationItemId: item.id, quantityAvailable: 0 }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_RATION_SHOP',
        entityAffected: 'RationShop',
        entityId: shop.id,
        detailsJson: JSON.stringify({ shopCode, shopName, district })
      }
    });

    res.status(201).json({ success: true, message: 'Ration shop registered successfully', data: shop });
  } catch (error) {
    next(error);
  }
};

export const assignShopkeeper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rationShopId, shopkeeperUserId } = req.body;
    const adminUserId = req.user?.userId;

    const user = await prisma.user.findUnique({ where: { id: shopkeeperUserId } });
    if (!user || user.role !== 'SHOPKEEPER') {
      return res.status(400).json({ success: false, message: 'Target user must exist and have SHOPKEEPER role.' });
    }

    const assignment = await prisma.shopkeeperProfile.upsert({
      where: { userId: shopkeeperUserId },
      update: { rationShopId },
      create: { userId: shopkeeperUserId, rationShopId }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ASSIGN_SHOPKEEPER_SHOP',
        entityAffected: 'ShopkeeperProfile',
        entityId: assignment.id,
        detailsJson: JSON.stringify({ shopkeeperUserId, rationShopId })
      }
    });

    res.json({ success: true, message: 'Shopkeeper assigned to FPS Shop successfully', data: assignment });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// 3. Commodity Master Data Management
// ----------------------------------------------------------------------
export const getCommodities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.rationItem.findMany({ orderBy: { itemCode: 'asc' } });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createCommodity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { itemCode, name, unit, standardPricePerUnit } = req.body;
    const adminUserId = req.user?.userId;

    const existing = await prisma.rationItem.findUnique({ where: { itemCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Commodity code '${itemCode}' already exists.` });
    }

    const item = await prisma.rationItem.create({
      data: { itemCode, name, unit, standardPricePerUnit: Number(standardPricePerUnit), status: 'ACTIVE' }
    });

    // Seed 0 balance stock records for all shops
    const shops = await prisma.rationShop.findMany();
    for (const shop of shops) {
      await prisma.stock.upsert({
        where: { rationShopId_rationItemId: { rationShopId: shop.id, rationItemId: item.id } },
        update: {},
        create: { rationShopId: shop.id, rationItemId: item.id, quantityAvailable: 0 }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_COMMODITY_MASTER',
        entityAffected: 'RationItem',
        entityId: item.id,
        detailsJson: JSON.stringify({ itemCode, name, standardPricePerUnit })
      }
    });

    res.status(201).json({ success: true, message: 'Commodity master record created', data: item });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// 4. Configurable Entitlement Rules Management
// ----------------------------------------------------------------------
export const getEntitlementRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const effectiveMonthYear = req.query.monthYear as string || '10-2026';
    const entitlements = await prisma.rationEntitlement.findMany({
      where: { effectiveMonthYear },
      include: { rationItem: true },
      orderBy: [{ category: 'asc' }, { rationItemId: 'asc' }]
    });

    res.json({ success: true, data: entitlements });
  } catch (error) {
    next(error);
  }
};

export const updateEntitlementRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, rationItemId, quotaPerMember, quotaFlatPerCard, subsidizedPricePerUnit, effectiveMonthYear } = req.body;
    const adminUserId = req.user?.userId;

    const rule = await prisma.rationEntitlement.upsert({
      where: {
        category_rationItemId_effectiveMonthYear: {
          category,
          rationItemId,
          effectiveMonthYear
        }
      },
      update: {
        quotaPerMember: Number(quotaPerMember),
        quotaFlatPerCard: Number(quotaFlatPerCard),
        subsidizedPricePerUnit: Number(subsidizedPricePerUnit)
      },
      create: {
        category,
        rationItemId,
        effectiveMonthYear,
        quotaPerMember: Number(quotaPerMember),
        quotaFlatPerCard: Number(quotaFlatPerCard),
        subsidizedPricePerUnit: Number(subsidizedPricePerUnit)
      },
      include: { rationItem: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CONFIGURE_ENTITLEMENT_RULE',
        entityAffected: 'RationEntitlement',
        entityId: rule.id,
        detailsJson: JSON.stringify({ category, rationItemId, effectiveMonthYear, quotaPerMember, quotaFlatPerCard, subsidizedPricePerUnit })
      }
    });

    res.json({ success: true, message: 'Entitlement rule configured successfully', data: rule });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// 5. User Account Status Toggle & Audit Logs
// ----------------------------------------------------------------------
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;
    const adminUserId = req.user?.userId;

    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'TOGGLE_USER_STATUS',
        entityAffected: 'User',
        entityId: id,
        detailsJson: JSON.stringify({ targetUserId: id, newStatus: status })
      }
    });

    res.json({ success: true, message: `User account status updated to ${status}`, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// 6. Reports & Analytics (FR-14)
// ----------------------------------------------------------------------
export const getReportsAndAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;
    const shopId = req.query.shopId as string;
    const commodityId = req.query.commodityId as string;
    const status = req.query.status as string;

    const where: any = {};
    if (startDateStr || endDateStr) {
      where.timestamp = {};
      if (startDateStr) where.timestamp.gte = new Date(startDateStr);
      if (endDateStr) where.timestamp.lte = new Date(endDateStr);
    }
    if (shopId) where.rationShopId = shopId;
    if (status) where.status = status;

    // Fetch total transactions count & total revenue amount
    const [totalTransactions, txnAgg, itemSummary, shopComparison, lowStockSummary, complaintSummary, recentFailedTxns] = await Promise.all([
      prisma.distributionTransaction.count({ where }),
      prisma.distributionTransaction.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      // Item quantities distributed
      prisma.distributionItem.groupBy({
        by: ['rationItemId'],
        where: commodityId ? { rationItemId: commodityId, transaction: where } : { transaction: where },
        _sum: { quantityDispensed: true, totalPrice: true },
        _count: { id: true }
      }),
      // Shop-wise breakdown
      prisma.distributionTransaction.groupBy({
        by: ['rationShopId'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true }
      }),
      // Stock & low stock summary
      prisma.stock.findMany({
        where: shopId ? { rationShopId: shopId } : {},
        include: { rationShop: true, rationItem: true },
        orderBy: { quantityAvailable: 'asc' }
      }),
      // Complaint breakdown
      prisma.complaint.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      // Failed or rejected transactions
      prisma.distributionTransaction.findMany({
        where: { ...where, status: { in: ['FAILED', 'CANCELLED'] } },
        include: { rationShop: true, beneficiary: { include: { user: true } } },
        take: 10,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Map item details
    const items = await prisma.rationItem.findMany();
    const itemMap = new Map(items.map(i => [i.id, i]));
    const quantitiesByCommodity = itemSummary.map(is => {
      const item = itemMap.get(is.rationItemId);
      return {
        rationItemId: is.rationItemId,
        name: item?.name || 'Unknown',
        unit: item?.unit || 'KG',
        totalQuantityDispensed: Number(is._sum.quantityDispensed || 0),
        totalValue: Number(is._sum.totalPrice || 0),
        dispenseCount: is._count.id
      };
    });

    // Map shop details
    const shops = await prisma.rationShop.findMany();
    const shopMap = new Map(shops.map(s => [s.id, s]));
    const shopComparisons = shopComparison.map(sc => {
      const shop = shopMap.get(sc.rationShopId);
      return {
        shopId: sc.rationShopId,
        shopCode: shop?.shopCode || 'N/A',
        shopName: shop?.shopName || 'Unknown Shop',
        transactionCount: sc._count.id,
        totalAmount: Number(sc._sum.totalAmount || 0)
      };
    });

    // Low stock count & list
    const lowStockList = lowStockSummary.filter(st => Number(st.quantityAvailable) < 100).map(st => ({
      id: st.id,
      shopCode: st.rationShop.shopCode,
      shopName: st.rationShop.shopName,
      commodityName: st.rationItem.name,
      quantityAvailable: Number(st.quantityAvailable),
      unit: st.rationItem.unit
    }));

    // Map complaint summary
    const complaintStats: Record<string, number> = {
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      REJECTED: 0
    };
    complaintSummary.forEach(c => {
      complaintStats[c.status] = c._count.id;
    });

    res.json({
      success: true,
      reportMeta: {
        generatedAt: new Date().toISOString(),
        filtersApplied: { startDateStr, endDateStr, shopId, commodityId, status },
        dataSource: 'DATABASE_COMMITTED_TRANSACTIONS'
      },
      data: {
        summary: {
          totalTransactions,
          totalSubsidizedAmount: Number(txnAgg._sum.totalAmount || 0),
          lowStockCount: lowStockList.length
        },
        quantitiesByCommodity,
        shopComparisons,
        lowStockList,
        complaintStats,
        failedTransactions: recentFailedTxns.map(ft => ({
          id: ft.id,
          transactionRef: ft.transactionRef,
          shopName: ft.rationShop.shopName,
          beneficiaryName: ft.beneficiary.user.name,
          status: ft.status,
          timestamp: ft.timestamp
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminUserId = req.user?.userId;
    const transactions = await prisma.distributionTransaction.findMany({
      include: {
        rationShop: true,
        beneficiary: { include: { user: true, rationCard: true } },
        items: { include: { rationItem: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Sanitize formula injection prefixes (=, +, -, @)
    const sanitizeCSVField = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val).replace(/"/g, '""');
      if (['=', '+', '-', '@'].includes(str.charAt(0))) {
        str = `'${str}`; // Prefix with single quote to disable execution in Excel
      }
      return `"${str}"`;
    };

    let csvContent = 'Transaction Ref,Receipt Date,Shop Code,Shop Name,Beneficiary Name,Ration Card No,Category,Verification Mode,Status,Total Amount (INR)\n';

    transactions.forEach(txn => {
      const row = [
        sanitizeCSVField(txn.transactionRef),
        sanitizeCSVField(new Date(txn.timestamp).toISOString()),
        sanitizeCSVField(txn.rationShop.shopCode),
        sanitizeCSVField(txn.rationShop.shopName),
        sanitizeCSVField(txn.beneficiary.user.name),
        sanitizeCSVField(txn.beneficiary.rationCard.rationCardNumber),
        sanitizeCSVField(txn.beneficiary.rationCard.category),
        sanitizeCSVField(txn.verificationMode),
        sanitizeCSVField(txn.status),
        sanitizeCSVField(Number(txn.totalAmount).toFixed(2))
      ].join(',');
      csvContent += row + '\n';
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EXPORT_REPORTS_CSV',
        entityAffected: 'DistributionTransaction',
        detailsJson: JSON.stringify({ recordCount: transactions.length })
      }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=PDS_Distribution_Report_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
