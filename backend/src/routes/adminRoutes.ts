import { Router } from 'express';
import {
  getDashboardStats,
  getAllShops,
  createRationShop,
  assignShopkeeper,
  getBeneficiaries,
  updateBeneficiaryStatus,
  getCommodities,
  createCommodity,
  getEntitlementRules,
  updateEntitlementRule,
  getAllUsers,
  updateUserStatus,
  getAuditLogs,
  getReportsAndAnalytics,
  exportReportsCSV
} from '../controllers/adminController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN']));

// Overview & Analytics
router.get('/dashboard-stats', getDashboardStats);
router.get('/reports', getReportsAndAnalytics);
router.get('/reports/export-csv', exportReportsCSV);

// Beneficiary & Eligibility Management
router.get('/beneficiaries', getBeneficiaries);
router.patch('/beneficiaries/:id/status', updateBeneficiaryStatus);

// Ration Shop & Assignment Management
router.get('/shops', getAllShops);
router.post('/shops', createRationShop);
router.post('/shops/assign-shopkeeper', assignShopkeeper);

// Master Data & Commodities
router.get('/commodities', getCommodities);
router.post('/commodities', createCommodity);

// Configurable Entitlements Policy
router.get('/entitlements', getEntitlementRules);
router.post('/entitlements', updateEntitlementRule);

// User Accounts & Audit Logs
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/audit-logs', getAuditLogs);

export default router;
