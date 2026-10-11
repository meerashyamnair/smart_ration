import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middlewares/authMiddleware';

export const registerBeneficiary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password, rationCardNumber, category, familyMembersCount, fpsShopId, address } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const existingCard = await prisma.rationCard.findUnique({ where: { rationCardNumber } });
    if (existingCard) {
      return res.status(400).json({ success: false, message: 'Ration card number already registered' });
    }

    // Default shop fallback if unspecified
    const shop = await prisma.rationShop.findFirst({
      where: { OR: [{ id: fpsShopId }, { shopCode: fpsShopId || 'FPS_DELHI_001' }] }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Selected Fair Price Shop not found' });
    }

    const hashedPassword = await hashPassword(password);
    const qrToken = `CARD_${rationCardNumber}_${Date.now()}`;

    const newUser = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash: hashedPassword,
          role: 'BENEFICIARY'
        }
      });

      const rationCard = await tx.rationCard.create({
        data: {
          rationCardNumber,
          qrToken,
          category,
          familyMembersCount: Number(familyMembersCount),
          rationShopId: shop.id,
          address
        }
      });

      const beneficiary = await tx.beneficiary.create({
        data: {
          userId: user.id,
          rationCardId: rationCard.id
        }
      });

      return { user, rationCard, beneficiary };
    });

    const token = generateToken({ userId: newUser.user.id, role: newUser.user.role, email: newUser.user.email });

    res.status(201).json({
      success: true,
      message: 'Beneficiary registered successfully',
      data: {
        token,
        user: {
          id: newUser.user.id,
          name: newUser.user.name,
          email: newUser.user.email,
          role: newUser.user.role
        },
        rationCard: newUser.rationCard
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        beneficiary: {
          include: { rationCard: { include: { rationShop: true } } }
        },
        shopkeeperProfile: {
          include: { rationShop: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user.id, role: user.role, email: user.email });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          beneficiary: user.beneficiary,
          managedShop: user.shopkeeperProfile?.rationShop
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        beneficiary: {
          include: { rationCard: { include: { rationShop: true } } }
        },
        shopkeeperProfile: {
          include: { rationShop: true }
        }
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        ...user,
        managedShop: user.shopkeeperProfile?.rationShop
      }
    });
  } catch (error) {
    next(error);
  }
};
