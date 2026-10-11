import { Router } from 'express';
import { verifyQR, dispenseRation, getReceiptById } from '../controllers/distributionController';
import { authenticate, authorize, verifyShopkeeperShopAccess } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { QRVerifySchema, DispenseRationSchema } from 'shared';

const router = Router();

router.use(authenticate);

// Publicly accessible to all authenticated roles with internal ownership checks
router.get('/receipts/:id', getReceiptById);

// Restricted dealer endpoints
router.use(authorize(['SHOPKEEPER', 'ADMIN']));
router.post('/verify-qr', validate(QRVerifySchema), verifyQR);
router.post('/dispense', verifyShopkeeperShopAccess, validate(DispenseRationSchema), dispenseRation);

export default router;
