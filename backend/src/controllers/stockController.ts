import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { MovementReason } from '@prisma/client';
import { logAuditEvent } from '../services/auditLogService';

// 1. Get Shop Stock Inventory with Low-Stock Flags
export const getShopStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    let shopId: string | undefined;

    if (req.user?.role === 'SHOPKEEPER') {
      const shopProfile = await prisma.shopkeeperProfile.findUnique({
        where: { userId },
        include: { rationShop: true }
      });
      if (!shopProfile) {
        return res.status(404).json({ success: false, message: 'Assigned Fair Price Shop not found' });
      }
      shopId = shopProfile.rationShopId;
    } else {
      shopId = (req.query.shopId as string) || (await prisma.rationShop.findFirst())?.id;
    }

    if (!shopId) {
      return res.status(404).json({ success: false, message: 'Shop ID required' });
    }

    const shop = await prisma.rationShop.findUnique({ where: { id: shopId } });
    const stocks = await prisma.stock.findMany({
      where: { rationShopId: shopId },
      include: { rationItem: true }
    });

    const formattedStocks = stocks.map(st => {
      const qty = Number(st.quantityAvailable);
      return {
        id: st.id,
        rationItemId: st.rationItemId,
        commodity: st.rationItem,
        quantityAvailable: qty,
        isLowStock: qty < 100, // Threshold flag
        lastUpdated: st.lastUpdated
      };
    });

    res.json({
      success: true,
      data: {
        shop,
        stocks: formattedStocks
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Record Authorized Stock Addition / Manual Adjustment
export const adjustStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rationItemId, quantityChange, reason, referenceId } = req.body;
    const userId = req.user?.userId;

    let shopId: string | undefined;

    if (req.user?.role === 'SHOPKEEPER') {
      const shopProfile = await prisma.shopkeeperProfile.findUnique({ where: { userId } });
      if (!shopProfile) {
        return res.status(404).json({ success: false, message: 'Assigned Fair Price Shop not found' });
      }
      shopId = shopProfile.rationShopId;
    } else {
      shopId = req.body.rationShopId || (await prisma.rationShop.findFirst())?.id;
    }

    if (!shopId) return res.status(404).json({ success: false, message: 'Ration Shop ID required' });

    const changeQty = Number(quantityChange);
    if (isNaN(changeQty) || changeQty === 0) {
      return res.status(400).json({ success: false, message: 'Valid non-zero quantity change required' });
    }

    const movementReason = (reason as MovementReason) || (changeQty > 0 ? MovementReason.REPLENISHMENT : MovementReason.ADJUSTMENT);

    // ATOMIC TRANSACTION: Update Stock + Log StockMovement + Record AuditLog
    const result = await prisma.$transaction(async (tx: any) => {
      const stock = await tx.stock.findUnique({
        where: {
          rationShopId_rationItemId: {
            rationShopId: shopId,
            rationItemId
          }
        },
        include: { rationItem: true }
      });

      const previousBalance = stock ? Number(stock.quantityAvailable) : 0;
      const newBalance = previousBalance + changeQty;

      // Safeguard: Prevent negative inventory balance
      if (newBalance < 0) {
        throw new Error(`Invalid stock adjustment. Resulting stock balance cannot be negative (${newBalance} ${stock?.rationItem?.unit || ''}). Current: ${previousBalance}`);
      }

      let updatedStock;
      if (stock) {
        updatedStock = await tx.stock.update({
          where: { id: stock.id },
          data: { quantityAvailable: newBalance }
        });
      } else {
        updatedStock = await tx.stock.create({
          data: {
            rationShopId: shopId,
            rationItemId,
            quantityAvailable: newBalance
          }
        });
      }

      // Record Traceable Stock Movement
      const movement = await tx.stockMovement.create({
        data: {
          rationShopId: shopId,
          rationItemId,
          reason: movementReason,
          quantityChange: changeQty,
          previousBalance,
          newBalance,
          referenceId: referenceId || `STOCK_ADJ_${Date.now()}`,
          operatorId: userId
        },
        include: { rationItem: true }
      });

      return { stock: updatedStock, movement };
    });

    // Write Security Audit Record
    await logAuditEvent({
      userId,
      action: 'ADJUST_STOCK_INVENTORY',
      entityAffected: 'Stock',
      entityId: result.stock.id,
      details: { shopId, rationItemId, quantityChange: changeQty, reason: movementReason },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Stock inventory updated successfully',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Stock adjustment failed' });
  }
};

// 3. Get Stock Movement Logs
export const getStockMovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    let shopId: string | undefined;

    if (req.user?.role === 'SHOPKEEPER') {
      const shopProfile = await prisma.shopkeeperProfile.findUnique({ where: { userId } });
      shopId = shopProfile?.rationShopId;
    } else {
      shopId = (req.query.shopId as string) || (await prisma.rationShop.findFirst())?.id;
    }

    if (!shopId) return res.status(404).json({ success: false, message: 'Shop ID required' });

    const movements = await prisma.stockMovement.findMany({
      where: { rationShopId: shopId },
      include: { rationItem: true },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const formatted = movements.map(m => ({
      ...m,
      quantityChange: Number(m.quantityChange),
      previousBalance: Number(m.previousBalance),
      newBalance: Number(m.newBalance)
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// 4. Get Shop Dashboard Summary Stats
export const getShopDashboardSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const shopProfile = await prisma.shopkeeperProfile.findUnique({
      where: { userId },
      include: { rationShop: true }
    });

    if (!shopProfile) {
      return res.status(404).json({ success: false, message: 'Shopkeeper shop assignment not found' });
    }

    const shopId = shopProfile.rationShopId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayDateStr = new Date().toISOString().split('T')[0];

    // Parallel Dashboard queries
    const [todayTxnAgg, todayTxnCount, todayQueueCount, recentTxns, stocks] = await Promise.all([
      prisma.distributionTransaction.aggregate({
        where: { rationShopId: shopId, timestamp: { gte: todayStart } },
        _sum: { totalAmount: true }
      }),
      prisma.distributionTransaction.count({
        where: { rationShopId: shopId, timestamp: { gte: todayStart } }
      }),
      prisma.queueBooking.count({
        where: { rationShopId: shopId, bookingDate: todayDateStr, status: 'BOOKED' }
      }),
      prisma.distributionTransaction.findMany({
        where: { rationShopId: shopId },
        include: { beneficiary: { include: { user: true } }, items: { include: { rationItem: true } } },
        orderBy: { timestamp: 'desc' },
        take: 5
      }),
      prisma.stock.findMany({
        where: { rationShopId: shopId },
        include: { rationItem: true }
      })
    ]);

    const formattedStocks = stocks.map(st => {
      const qty = Number(st.quantityAvailable);
      return {
        ...st,
        quantityAvailable: qty,
        isLowStock: qty < 100
      };
    });

    res.json({
      success: true,
      data: {
        shop: shopProfile.rationShop,
        todayDistributionCount: todayTxnCount,
        todayDistributionAmount: Number(todayTxnAgg._sum.totalAmount || 0),
        todayQueueBookingsCount: todayQueueCount,
        stocks: formattedStocks,
        recentTransactions: recentTxns.map(t => ({
          ...t,
          totalAmount: Number(t.totalAmount)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
