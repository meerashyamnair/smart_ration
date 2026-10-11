import { Router } from 'express';
import { getShopStock, getShopTransactions } from '../controllers/shopkeeperController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['SHOPKEEPER', 'ADMIN']));

router.get('/stock', getShopStock);
router.get('/transactions', getShopTransactions);

export default router;
