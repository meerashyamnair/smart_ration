import axios from 'axios';
import { prisma } from '../config/prisma';

const API_URL = 'http://localhost:5000/api';

async function runAdminModuleTests() {
  console.log('🧪 Starting Administration Module (FR-13) Integration & Security Audit Tests...\n');

  try {
    // 1. Authenticate Admin User
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    if (!adminUser) throw new Error('Admin test user not found.');

    const adminLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: adminUser.email,
      password: 'password123'
    });
    const adminToken = adminLoginRes.data.data.token;
    const adminAuthHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // Authenticate Beneficiary User (Non-Admin Role) for Authorization Test
    const beneficiaryUser = await prisma.user.findFirst({
      where: { role: 'BENEFICIARY' }
    });
    if (!beneficiaryUser) throw new Error('Beneficiary test user not found.');

    const benLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: beneficiaryUser.email,
      password: 'password123'
    });
    const benToken = benLoginRes.data.data.token;
    const benAuthHeaders = { headers: { Authorization: `Bearer ${benToken}` } };

    // -------------------------------------------------------------
    // Test 1: Role-Based Authorization Safeguard (Non-Admin Block)
    // -------------------------------------------------------------
    console.log('--- Test 1: Role Authorization Safeguard ---');
    try {
      await axios.get(`${API_URL}/admin/dashboard-stats`, benAuthHeaders);
      throw new Error('Test 1 Failed: Non-admin user was allowed to access admin dashboard endpoints!');
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Test 1 Passed: Beneficiary blocked from admin routes (HTTP 403 Forbidden).');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 2: Fetch Admin Overview Dashboard Metrics
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Admin Dashboard Analytics & Low-Stock Alerts ---');
    const statsRes = await axios.get(`${API_URL}/admin/dashboard-stats?periodDays=30`, adminAuthHeaders);
    if (!statsRes.data.success || statsRes.data.data.totalBeneficiaries === undefined) {
      throw new Error('Test 2 Failed: Dashboard stats returned invalid payload.');
    }
    console.log('✅ Test 2 Passed: Retrieved admin metrics. Total Beneficiaries:', statsRes.data.data.totalBeneficiaries, '| FPS Shops:', statsRes.data.data.totalShops, '| Low Stock Items:', statsRes.data.data.lowStockAlertsCount);

    // -------------------------------------------------------------
    // Test 3: Beneficiary Record Search & Status Update
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Beneficiary Records Management & Audit Logging ---');
    const benListRes = await axios.get(`${API_URL}/admin/beneficiaries?page=1&limit=5`, adminAuthHeaders);
    if (!benListRes.data.success || benListRes.data.data.length === 0) {
      throw new Error('Test 3 Failed: Beneficiary search list returned empty.');
    }
    const targetBen = benListRes.data.data[0];

    const updateBenRes = await axios.patch(`${API_URL}/admin/beneficiaries/${targetBen.id}/status`, {
      status: 'ACTIVE',
      category: 'BPL',
      familyMembersCount: 5
    }, adminAuthHeaders);

    if (!updateBenRes.data.success) {
      throw new Error('Test 3 Failed: Beneficiary status update failed.');
    }
    console.log(`✅ Test 3 Passed: Beneficiary eligibility updated. Ration Card ${targetBen.rationCard.rationCardNumber} family size updated to 5.`);

    // -------------------------------------------------------------
    // Test 4: Create Ration Shop & Assign Shopkeeper
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Ration Shop Creation & Dealer Assignment ---');
    const newShopCode = `FPS_TEST_${Date.now()}`;
    const createShopRes = await axios.post(`${API_URL}/admin/shops`, {
      shopCode: newShopCode,
      shopName: 'Test Administrative Fair Price Shop',
      address: 'Sector 5, PDS Hub',
      district: 'Central',
      pincode: '110001',
      contactNumber: '+919999988888'
    }, adminAuthHeaders);

    if (!createShopRes.data.success) {
      throw new Error('Test 4 Failed: Ration shop creation failed.');
    }
    const createdShopId = createShopRes.data.data.id;
    console.log(`✅ Test 4 Passed: Registered FPS Shop ${newShopCode}.`);

    // Assign shopkeeper
    const shopkeeperUser = await prisma.user.findFirst({
      where: { role: 'SHOPKEEPER' }
    });
    if (shopkeeperUser) {
      const assignRes = await axios.post(`${API_URL}/admin/shops/assign-shopkeeper`, {
        rationShopId: createdShopId,
        shopkeeperUserId: shopkeeperUser.id
      }, adminAuthHeaders);
      if (!assignRes.data.success) {
        throw new Error('Test 4 Failed: Shopkeeper assignment failed.');
      }
      console.log(`✅ Test 4 Passed: Shopkeeper ${shopkeeperUser.email} assigned to shop ${newShopCode}.`);
    }

    // -------------------------------------------------------------
    // Test 5: Configure Monthly Entitlement Policy Rule
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Configurable Entitlement Rule Policy ---');
    const items = await prisma.rationItem.findMany();
    if (items.length > 0) {
      const testItem = items[0];
      const ruleRes = await axios.post(`${API_URL}/admin/entitlements`, {
        category: 'AAY',
        rationItemId: testItem.id,
        effectiveMonthYear: '10-2026',
        quotaPerMember: 0.00,
        quotaFlatPerCard: 25.00,
        subsidizedPricePerUnit: 1.50
      }, adminAuthHeaders);

      if (!ruleRes.data.success) {
        throw new Error('Test 5 Failed: Entitlement policy rule configuration failed.');
      }
      console.log(`✅ Test 5 Passed: Configured AAY Entitlement Policy for ${testItem.name} (25 KG flat @ ₹1.50/KG).`);
    }

    // -------------------------------------------------------------
    // Test 6: Verify Administrative Security Audit Logging
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Security Audit Logging Verification ---');
    const auditRes = await axios.get(`${API_URL}/admin/audit-logs?page=1&limit=10`, adminAuthHeaders);
    if (!auditRes.data.success || auditRes.data.data.length === 0) {
      throw new Error('Test 6 Failed: Security audit log entries were not recorded.');
    }

    const actions = auditRes.data.data.map((log: any) => log.action);
    console.log('✅ Test 6 Passed: Verified security audit logs captured actions:', Array.from(new Set(actions)).join(', '));

    console.log('\n🎉 ALL Administration Module (FR-13) Integration & Security Audit Tests Passed Successfully!\n');
  } catch (err: any) {
    console.error('❌ Integration Test Suite Failed:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAdminModuleTests();
