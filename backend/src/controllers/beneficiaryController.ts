import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import QRCode from 'qrcode';

// 1. Get Beneficiary Profile
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        rationCard: { include: { rationShop: true } }
      }
    });

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    res.json({ success: true, data: beneficiary });
  } catch (error) {
    next(error);
  }
};

// 2. Edit Permitted Profile Fields (Phone, Address)
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { phone, address } = req.body;

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { userId },
      include: { rationCard: true }
    });

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    await prisma.$transaction(async (tx) => {
      if (phone) {
        await tx.user.update({
          where: { id: userId },
          data: { phone }
        });
      }

      if (address) {
        await tx.rationCard.update({
          where: { id: beneficiary.rationCardId },
          data: { address }
        });
      }
    });

    const updated = await prisma.beneficiary.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        rationCard: { include: { rationShop: true } }
      }
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

// 3. Get Digital Ration Card & QR Image
export const getRationCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        rationCard: { include: { rationShop: true } }
      }
    });

    if (!beneficiary || !beneficiary.rationCard) {
      return res.status(404).json({ success: false, message: 'Beneficiary ration card profile not found' });
    }

    const qrDataUrl = await QRCode.toDataURL(beneficiary.rationCard.qrToken);

    res.json({
      success: true,
      data: {
        id: beneficiary.rationCard.id,
        rationCardNumber: beneficiary.rationCard.rationCardNumber,
        category: beneficiary.rationCard.category,
        familyMembersCount: beneficiary.rationCard.familyMembersCount,
        status: beneficiary.rationCard.status,
        address: beneficiary.rationCard.address,
        user: beneficiary.user,
        fpsShop: beneficiary.rationCard.rationShop,
        qrToken: beneficiary.rationCard.qrToken,
        qrCodeImage: qrDataUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Monthly Entitlements with Claimed & Remaining Balances
export const getEntitlements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { userId },
      include: { rationCard: true }
    });

    if (!beneficiary || !beneficiary.rationCard) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    const currentMonthYear = '10-2026';

    const entitlements = await prisma.rationEntitlement.findMany({
      where: { category: beneficiary.rationCard.category, effectiveMonthYear: currentMonthYear },
      include: { rationItem: true }
    });

    const currentMonthStart = new Date(2026, 9, 1);
    const transactions = await prisma.distributionTransaction.findMany({
      where: {
        beneficiaryId: beneficiary.id,
        status: 'SUCCESS',
        timestamp: { gte: currentMonthStart }
      },
      include: { items: true }
    });

    const claimedMap: { [itemId: string]: number } = {};
    transactions.forEach(txn => {
      txn.items.forEach(item => {
        claimedMap[item.rationItemId] = (claimedMap[item.rationItemId] || 0) + Number(item.quantityDispensed);
      });
    });

    const calculatedEntitlements = entitlements.map((item: any) => {
      const quotaPerMember = Number(item.quotaPerMember);
      const quotaFlat = Number(item.quotaFlatPerCard);
      const totalEligible = (quotaPerMember * beneficiary.rationCard.familyMembersCount) + quotaFlat;
      const claimedQty = claimedMap[item.rationItemId] || 0;
      const remainingQty = Math.max(0, totalEligible - claimedQty);

      return {
        id: item.id,
        item: item.rationItem,
        subsidizedPricePerUnit: Number(item.subsidizedPricePerUnit),
        totalEligibleQuota: totalEligible,
        claimedQuantity: claimedQty,
        remainingQuantity: remainingQty,
        effectiveMonthYear: currentMonthYear
      };
    });

    res.json({ success: true, data: calculatedEntitlements });
  } catch (error) {
    next(error);
  }
};

// 5. Get Paginated Distribution Transactions
export const getMyTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const beneficiary = await prisma.beneficiary.findUnique({ where: { userId } });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    const [total, transactions] = await Promise.all([
      prisma.distributionTransaction.count({ where: { beneficiaryId: beneficiary.id } }),
      prisma.distributionTransaction.findMany({
        where: { beneficiaryId: beneficiary.id },
        include: {
          rationShop: true,
          items: { include: { rationItem: true } },
          receipt: true
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      })
    ]);

    const formattedTxns = transactions.map(txn => ({
      ...txn,
      totalAmount: Number(txn.totalAmount),
      items: txn.items.map(i => ({
        ...i,
        quantityDispensed: Number(i.quantityDispensed),
        pricePerUnit: Number(i.pricePerUnit),
        totalPrice: Number(i.totalPrice)
      }))
    }));

    res.json({
      success: true,
      data: formattedTxns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get Transaction Receipt
export const getTransactionReceipt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const beneficiary = await prisma.beneficiary.findUnique({ where: { userId } });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    const transaction = await prisma.distributionTransaction.findFirst({
      where: { id, beneficiaryId: beneficiary.id },
      include: {
        rationShop: true,
        items: { include: { rationItem: true } },
        receipt: true,
        beneficiary: { include: { user: true, rationCard: true } }
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction record not found or unauthorized' });
    }

    res.json({
      success: true,
      data: {
        transactionRef: transaction.transactionRef,
        timestamp: transaction.timestamp,
        verificationMode: transaction.verificationMode,
        status: transaction.status,
        totalAmount: Number(transaction.totalAmount),
        beneficiaryName: transaction.beneficiary.user.name,
        rationCardNumber: transaction.beneficiary.rationCard.rationCardNumber,
        shopName: transaction.rationShop.shopName,
        shopCode: transaction.rationShop.shopCode,
        receiptNumber: transaction.receipt?.receiptNumber || `RCPT_${transaction.transactionRef}`,
        items: transaction.items.map((i: any) => ({
          name: i.rationItem.name,
          unit: i.rationItem.unit,
          quantity: Number(i.quantityDispensed),
          price: Number(i.pricePerUnit),
          total: Number(i.totalPrice)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
