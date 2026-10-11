import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getRationCard,
  getEntitlements,
  getMyTransactions,
  getTransactionReceipt
} from '../controllers/beneficiaryController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['BENEFICIARY', 'ADMIN']));

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/ration-card', getRationCard);
router.get('/entitlements', getEntitlements);
router.get('/transactions', getMyTransactions);
router.get('/transactions/:id/receipt', getTransactionReceipt);

export default router;
