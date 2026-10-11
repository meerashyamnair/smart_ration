import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../config/prisma';

export interface AuthRequest extends Request {
  user?: TokenPayload & {
    beneficiaryId?: string;
    rationShopId?: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    // Fetch entity association context for server-side authorization enforcement
    let beneficiaryId: string | undefined;
    let rationShopId: string | undefined;

    if (decoded.role === 'BENEFICIARY') {
      const ben = await prisma.beneficiary.findUnique({ where: { userId: decoded.userId } });
      beneficiaryId = ben?.id;
    } else if (decoded.role === 'SHOPKEEPER') {
      const shopProf = await prisma.shopkeeperProfile.findUnique({ where: { userId: decoded.userId } });
      rationShopId = shopProf?.rationShopId;
    }

    req.user = {
      ...decoded,
      beneficiaryId,
      rationShopId
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token signature' });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role permissions for this endpoint' });
    }

    next();
  };
};

export const verifyShopkeeperShopAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'ADMIN') return next();

  if (req.user?.role !== 'SHOPKEEPER' || !req.user.rationShopId) {
    return res.status(403).json({ success: false, message: 'Forbidden: No assigned Fair Price Shop found for shopkeeper' });
  }

  // If a shopId parameter or body field is passed, ensure it matches assigned shop
  const targetShopId = req.params.shopId || req.body.fpsShopId || req.body.rationShopId;
  if (targetShopId && targetShopId !== req.user.rationShopId) {
    return res.status(403).json({ success: false, message: 'Forbidden: Access restricted strictly to your assigned Fair Price Shop' });
  }

  next();
};

export const verifyBeneficiarySelfAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'ADMIN') return next();

  if (req.user?.role !== 'BENEFICIARY' || !req.user.beneficiaryId) {
    return res.status(403).json({ success: false, message: 'Forbidden: Beneficiary profile required' });
  }

  const targetBeneficiaryId = req.params.beneficiaryId || req.body.beneficiaryId;
  if (targetBeneficiaryId && targetBeneficiaryId !== req.user.beneficiaryId) {
    return res.status(403).json({ success: false, message: 'Forbidden: Cross-beneficiary access denied. You can only view/manage your own profile data.' });
  }

  next();
};
