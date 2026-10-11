import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getShopStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopkeeperUserId = req.user?.userId;
    const shopProfile = await prisma.shopkeeperProfile.findUnique({
      where: { userId: shopkeeperUserId },
      include: { rationShop: true }
    });

    if (!shopProfile) {
      return res.status(404).json({ success: false, message: 'Ration Shop assignment not found' });
    }

    const stocks = await prisma.stock.findMany({
      where: { rationShopId: shopProfile.rationShopId },
      include: { rationItem: true }
    });

    const formattedStocks = stocks.map(st => ({
      ...st,
      quantityAvailable: Number(st.quantityAvailable)
    }));

    res.json({
      success: true,
      data: {
        shop: shopProfile.rationShop,
        stocks: formattedStocks
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getShopTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopkeeperUserId = req.user?.userId;
    const shopProfile = await prisma.shopkeeperProfile.findUnique({
      where: { userId: shopkeeperUserId }
    });

    if (!shopProfile) {
      return res.status(404).json({ success: false, message: 'Ration Shop assignment not found' });
    }

    const transactions = await prisma.distributionTransaction.findMany({
      where: { rationShopId: shopProfile.rationShopId },
      include: {
        beneficiary: { include: { user: true } },
        items: { include: { rationItem: true } },
        receipt: true
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};
