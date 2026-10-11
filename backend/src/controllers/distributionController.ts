import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { MovementReason, TxnStatus } from '@prisma/client';
import { NotificationService } from '../services/notificationService';

export const verifyQR = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { qrToken, manualReference } = req.body;
    const tokenOrRef = (qrToken || manualReference || '').trim();

    if (!tokenOrRef) {
      return res.status(400).json({ success: false, message: 'QR token or ration card reference is required' });
    }

    const shopkeeperUserId = req.user?.userId;
    const userRole = req.user?.role;

    let shopProfile = null;
    if (userRole === 'SHOPKEEPER' && shopkeeperUserId) {
      shopProfile = await prisma.shopkeeperProfile.findUnique({
        where: { userId: shopkeeperUserId },
        include: { rationShop: true }
      });
    }

    const rationCard = await prisma.rationCard.findFirst({
      where: {
        OR: [
          { qrToken: tokenOrRef },
          { rationCardNumber: tokenOrRef },
          { id: tokenOrRef }
        ]
      },
      include: {
        beneficiary: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        rationShop: true
      }
    });

    if (!rationCard || !rationCard.beneficiary) {
      return res.status(404).json({ success: false, message: 'Invalid, revoked, or unregistered QR Code / Ration Card' });
    }

    if (rationCard.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Ration Card is currently ${rationCard.status}. Distribution not allowed.`
      });
    }

    // Verify shop assignment rule if shopkeeper
    let shopMismatch = false;
    let shopMismatchWarning = null;
    if (shopProfile && shopProfile.rationShopId !== rationCard.rationShopId) {
      shopMismatch = true;
      shopMismatchWarning = `Beneficiary is assigned to shop '${rationCard.rationShop.shopName}' (${rationCard.rationShop.shopCode}), but scanning shop is '${shopProfile.rationShop.shopName}'. Portability rules apply.`;
    }

    // Calculate current month's effective entitlement and remaining quota
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const effectiveMonthYear = `${currentMonth}-${currentYear}`;

    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch active entitlement policies for card category
    let entitlements = await prisma.rationEntitlement.findMany({
      where: {
        category: rationCard.category,
        effectiveMonthYear
      },
      include: { rationItem: true }
    });

    // Fallback if specific month entitlement record isn't seeded: grab general category entitlements
    if (entitlements.length === 0) {
      entitlements = await prisma.rationEntitlement.findMany({
        where: { category: rationCard.category },
        include: { rationItem: true }
      });
    }

    // Fetch current month's completed distributions for this beneficiary
    const monthlyDistributions = await prisma.distributionTransaction.findMany({
      where: {
        beneficiaryId: rationCard.beneficiary.id,
        status: TxnStatus.SUCCESS,
        timestamp: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        items: true
      }
    });

    // Map consumed quantities per ration item
    const consumedMap: Record<string, number> = {};
    monthlyDistributions.forEach(txn => {
      txn.items.forEach(item => {
        consumedMap[item.rationItemId] = (consumedMap[item.rationItemId] || 0) + Number(item.quantityDispensed);
      });
    });

    // Determine current stock at scanning shop
    const shopIdForStock = shopProfile ? shopProfile.rationShopId : rationCard.rationShopId;
    const shopStocks = await prisma.stock.findMany({
      where: { rationShopId: shopIdForStock }
    });
    const stockMap: Record<string, number> = {};
    shopStocks.forEach(st => {
      stockMap[st.rationItemId] = Number(st.quantityAvailable);
    });

    const calculatedEntitlements = entitlements.map((ent: any) => {
      const quotaPerMember = Number(ent.quotaPerMember);
      const quotaFlat = Number(ent.quotaFlatPerCard);
      const totalMonthlyEligible = (quotaPerMember * rationCard.familyMembersCount) + quotaFlat;

      const alreadyDrawn = consumedMap[ent.rationItemId] || 0;
      const remainingQuota = Math.max(0, totalMonthlyEligible - alreadyDrawn);
      const stockAvailable = stockMap[ent.rationItemId] || 0;

      return {
        rationItemId: ent.rationItemId,
        itemCode: ent.rationItem.itemCode,
        name: ent.rationItem.name,
        unit: ent.rationItem.unit,
        monthlyQuota: totalMonthlyEligible,
        alreadyDrawn,
        remainingQuota,
        stockAvailable,
        subsidizedPricePerUnit: Number(ent.subsidizedPricePerUnit)
      };
    });

    res.json({
      success: true,
      message: 'QR token verified successfully',
      data: {
        beneficiary: {
          id: rationCard.beneficiary.id,
          userId: rationCard.beneficiary.userId,
          name: rationCard.beneficiary.user.name,
          email: rationCard.beneficiary.user.email,
          phone: rationCard.beneficiary.user.phone,
          rationCardNumber: rationCard.rationCardNumber,
          category: rationCard.category,
          familyMembersCount: rationCard.familyMembersCount,
          cardStatus: rationCard.status,
          assignedShop: {
            id: rationCard.rationShop.id,
            shopCode: rationCard.rationShop.shopCode,
            shopName: rationCard.rationShop.shopName
          }
        },
        verificationMeta: {
          shopMismatch,
          shopMismatchWarning,
          verifiedAt: new Date().toISOString(),
          effectiveMonthYear
        },
        entitlements: calculatedEntitlements
      }
    });
  } catch (error) {
    next(error);
  }
};

export const dispenseRation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { beneficiaryId, items, idempotencyKey, verificationMode } = req.body;
    const shopkeeperUserId = req.user?.userId;
    const userRole = req.user?.role;

    if (!beneficiaryId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload: beneficiaryId and items are required' });
    }

    let shopId: string | undefined;

    if (userRole === 'SHOPKEEPER') {
      const shopProfile = await prisma.shopkeeperProfile.findUnique({
        where: { userId: shopkeeperUserId },
        include: { rationShop: true }
      });

      if (!shopProfile) {
        return res.status(403).json({ success: false, message: 'Forbidden: Shopkeeper profile not assigned to any shop' });
      }
      shopId = shopProfile.rationShopId;
    } else if (userRole === 'ADMIN') {
      shopId = req.body.rationShopId;
    }

    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Ration shop context is missing' });
    }

    // Idempotency check
    if (idempotencyKey) {
      const existingTxn = await prisma.distributionTransaction.findUnique({
        where: { idempotencyKey },
        include: {
          items: { include: { rationItem: true } },
          beneficiary: { include: { user: true } },
          receipt: true
        }
      });
      if (existingTxn) {
        return res.json({
          success: true,
          message: 'Duplicate submission prevented by Idempotency Key',
          data: existingTxn
        });
      }
    }

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
      include: { user: true, rationCard: true }
    });

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    if (beneficiary.rationCard.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: `Ration Card is ${beneficiary.rationCard.status}. Dispensing prohibited.` });
    }

    // Server-side entitlement consumption verification
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const effectiveMonthYear = `${currentMonth}-${currentYear}`;

    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const existingMonthlyTxns = await prisma.distributionTransaction.findMany({
      where: {
        beneficiaryId: beneficiary.id,
        status: TxnStatus.SUCCESS,
        timestamp: { gte: startOfMonth, lte: endOfMonth }
      },
      include: { items: true }
    });

    const consumedMap: Record<string, number> = {};
    existingMonthlyTxns.forEach(txn => {
      txn.items.forEach(i => {
        consumedMap[i.rationItemId] = (consumedMap[i.rationItemId] || 0) + Number(i.quantityDispensed);
      });
    });

    // Run distribution inside an isolated database transaction
    const result = await prisma.$transaction(async (tx: any) => {
      let totalAmount = 0;
      const transactionItemsData = [];
      const stockMovementLogs = [];

      for (const reqItem of items) {
        const reqQty = Number(reqItem.quantity);
        if (isNaN(reqQty) || reqQty <= 0) continue;

        // Check active entitlement limit for item
        let entitlement = await tx.rationEntitlement.findFirst({
          where: { category: beneficiary.rationCard.category, rationItemId: reqItem.rationItemId, effectiveMonthYear }
        });
        if (!entitlement) {
          entitlement = await tx.rationEntitlement.findFirst({
            where: { category: beneficiary.rationCard.category, rationItemId: reqItem.rationItemId }
          });
        }

        const rationItem = await tx.rationItem.findUnique({
          where: { id: reqItem.rationItemId }
        });

        if (!rationItem) {
          throw new Error(`Ration item '${reqItem.rationItemId}' does not exist.`);
        }

        if (entitlement) {
          const quotaPerMember = Number(entitlement.quotaPerMember);
          const quotaFlat = Number(entitlement.quotaFlatPerCard);
          const totalMonthlyQuota = (quotaPerMember * beneficiary.rationCard.familyMembersCount) + quotaFlat;
          const alreadyDrawn = consumedMap[reqItem.rationItemId] || 0;
          const remainingQuota = Math.max(0, totalMonthlyQuota - alreadyDrawn);

          if (reqQty > remainingQuota + 0.001) {
            throw new Error(`Requested quantity (${reqQty} ${rationItem.unit}) exceeds remaining monthly entitlement quota (${remainingQuota.toFixed(2)} ${rationItem.unit}) for ${rationItem.name}`);
          }
        }

        // Lock & verify shop stock
        const stock = await tx.stock.findUnique({
          where: {
            rationShopId_rationItemId: {
              rationShopId: shopId,
              rationItemId: reqItem.rationItemId
            }
          }
        });

        if (!stock) {
          throw new Error(`Ration shop inventory record missing for ${rationItem.name}`);
        }

        const availQty = Number(stock.quantityAvailable);
        if (availQty < reqQty) {
          throw new Error(`Insufficient shop stock for ${rationItem.name}. Available: ${availQty} ${rationItem.unit}, Requested: ${reqQty} ${rationItem.unit}`);
        }

        const pricePerUnit = entitlement ? Number(entitlement.subsidizedPricePerUnit) : Number(rationItem.standardPricePerUnit);
        const lineTotal = pricePerUnit * reqQty;
        totalAmount += lineTotal;

        const newStockBalance = availQty - reqQty;

        // Deduct stock balance
        await tx.stock.update({
          where: { id: stock.id },
          data: { quantityAvailable: newStockBalance }
        });

        stockMovementLogs.push({
          rationShopId: shopId,
          rationItemId: reqItem.rationItemId,
          reason: MovementReason.DISPENSING,
          quantityChange: -reqQty,
          previousBalance: availQty,
          newBalance: newStockBalance,
          operatorId: shopkeeperUserId || 'SYSTEM'
        });

        transactionItemsData.push({
          rationItemId: reqItem.rationItemId,
          quantityDispensed: reqQty,
          pricePerUnit,
          totalPrice: lineTotal
        });
      }

      if (transactionItemsData.length === 0) {
        throw new Error('No valid items provided for distribution');
      }

      const transactionRef = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      const transaction = await tx.distributionTransaction.create({
        data: {
          transactionRef,
          idempotencyKey: idempotencyKey || `IDEM_${transactionRef}`,
          beneficiaryId: beneficiary.id,
          rationShopId: shopId,
          totalAmount,
          verificationMode: verificationMode || 'QR_CODE',
          status: TxnStatus.SUCCESS,
          items: {
            create: transactionItemsData
          }
        },
        include: {
          items: { include: { rationItem: true } },
          beneficiary: { include: { user: true, rationCard: true } },
          rationShop: true
        }
      });

      for (const log of stockMovementLogs) {
        await tx.stockMovement.create({
          data: {
            ...log,
            referenceId: transaction.id
          }
        });
      }

      const receiptNumber = `RCPT_${transactionRef}`;
      const receiptPayload = JSON.stringify({
        receiptNumber,
        transactionRef: transaction.transactionRef,
        timestamp: transaction.timestamp,
        beneficiaryName: beneficiary.user.name,
        rationCardNumber: beneficiary.rationCard.rationCardNumber,
        category: beneficiary.rationCard.category,
        shopCode: transaction.rationShop.shopCode,
        shopName: transaction.rationShop.shopName,
        items: transaction.items.map((i: any) => ({
          name: i.rationItem.name,
          quantity: Number(i.quantityDispensed),
          unit: i.rationItem.unit,
          price: Number(i.pricePerUnit),
          total: Number(i.totalPrice)
        })),
        totalAmount
      });

      const receipt = await tx.digitalReceipt.create({
        data: {
          receiptNumber,
          transactionId: transaction.id,
          receiptPayload
        }
      });

      // Log Security Audit Event
      await tx.auditLog.create({
        data: {
          userId: shopkeeperUserId || null,
          action: 'DISPENSE_RATION_TRANSACTION',
          entityAffected: 'DistributionTransaction',
          entityId: transaction.id,
          detailsJson: JSON.stringify({
            transactionRef,
            beneficiaryId: beneficiary.id,
            totalAmount,
            itemCount: transactionItemsData.length
          })
        }
      });

      return { ...transaction, receipt };
    });

    // Dispatch async notification after successful DB commit
    try {
      await NotificationService.send({
        userId: beneficiary.userId,
        title: 'Ration Dispensed & Digital Receipt Issued',
        message: `Ration distribution of ₹${result.totalAmount.toFixed(2)} at ${result.rationShop.shopName} was completed successfully. Transaction Ref: ${result.transactionRef}.`,
        type: 'DISTRIBUTION'
      });
    } catch (notifErr) {
      console.warn('Post-transaction notification dispatch warning:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Ration dispensed successfully with atomic stock update & digital receipt',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Dispensing failed' });
  }
};

export const getReceiptById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    const beneficiaryId = req.user?.beneficiaryId;
    const assignedShopId = req.user?.rationShopId;

    const transaction = await prisma.distributionTransaction.findFirst({
      where: {
        OR: [
          { id },
          { transactionRef: id },
          { receipt: { receiptNumber: id } }
        ]
      },
      include: {
        rationShop: true,
        items: { include: { rationItem: true } },
        receipt: true,
        beneficiary: { include: { user: true, rationCard: true } }
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Digital receipt or transaction record not found' });
    }

    // Access Control Enforcement:
    // 1. Beneficiaries can ONLY view receipts for their own transactions.
    if (userRole === 'BENEFICIARY') {
      if (!beneficiaryId || transaction.beneficiaryId !== beneficiaryId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access restricted strictly to your own digital receipts.' });
      }
    }

    // 2. Shopkeepers can ONLY view receipts for transactions conducted at their assigned shop.
    if (userRole === 'SHOPKEEPER') {
      if (!assignedShopId || transaction.rationShopId !== assignedShopId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access restricted strictly to receipts issued by your assigned Fair Price Shop.' });
      }
    }

    let parsedPayload = null;
    if (transaction.receipt?.receiptPayload) {
      try {
        parsedPayload = JSON.parse(transaction.receipt.receiptPayload);
      } catch (e) {
        console.warn('Receipt payload parse warning:', e);
      }
    }

    const receiptData = {
      receiptNumber: transaction.receipt?.receiptNumber || `RCPT_${transaction.transactionRef}`,
      transactionRef: transaction.transactionRef,
      transactionId: transaction.id,
      timestamp: transaction.timestamp,
      issuedAt: transaction.receipt?.issuedAt || transaction.timestamp,
      verificationMode: transaction.verificationMode,
      status: transaction.status,
      totalAmount: Number(transaction.totalAmount),
      beneficiary: {
        id: transaction.beneficiary.id,
        name: transaction.beneficiary.user.name,
        rationCardNumber: transaction.beneficiary.rationCard.rationCardNumber,
        category: transaction.beneficiary.rationCard.category,
        familyMembersCount: transaction.beneficiary.rationCard.familyMembersCount
      },
      shop: {
        id: transaction.rationShop.id,
        shopCode: transaction.rationShop.shopCode,
        shopName: transaction.rationShop.shopName,
        district: transaction.rationShop.district,
        address: transaction.rationShop.address,
        pincode: transaction.rationShop.pincode,
        contactNumber: transaction.rationShop.contactNumber
      },
      items: transaction.items.map((i: any) => ({
        id: i.id,
        itemCode: i.rationItem.itemCode,
        name: i.rationItem.name,
        unit: i.rationItem.unit,
        quantityDispensed: Number(i.quantityDispensed),
        pricePerUnit: Number(i.pricePerUnit),
        totalPrice: Number(i.totalPrice)
      })),
      payloadSnapshot: parsedPayload
    };

    res.json({
      success: true,
      data: receiptData
    });
  } catch (error) {
    next(error);
  }
};
