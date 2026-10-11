import { Router } from 'express';
import {
  getShopStock,
  adjustStock,
  getStockMovements,
  getShopDashboardSummary
} from '../controllers/stockController';
import { authenticate, authorize, verifyShopkeeperShopAccess } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['SHOPKEEPER', 'ADMIN']));

router.get('/shop', verifyShopkeeperShopAccess, getShopStock);
router.get('/dashboard-summary', verifyShopkeeperShopAccess, getShopDashboardSummary);
router.post('/adjust', verifyShopkeeperShopAccess, adjustStock);
router.get('/movements', verifyShopkeeperShopAccess, getStockMovements);

export default router;
