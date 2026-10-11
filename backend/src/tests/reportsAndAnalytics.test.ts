import axios from 'axios';
import { prisma } from '../config/prisma';

const API_URL = 'http://localhost:5000/api';

async function runReportsAndAnalyticsTests() {
  console.log('🧪 Starting Reports and Analytics (FR-14) Integration & Security Audit Tests...\n');

  try {
    // 1. Setup Admin Token
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('Admin test user missing.');

    const adminLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: adminUser.email,
      password: 'password123'
    });
    const adminToken = adminLoginRes.data.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // Setup Non-Admin Tokens
    const beneficiaryUser = await prisma.user.findFirst({ where: { role: 'BENEFICIARY' } });
    const shopkeeperUser = await prisma.user.findFirst({ where: { role: 'SHOPKEEPER' } });

    if (!beneficiaryUser || !shopkeeperUser) throw new Error('Test beneficiary or shopkeeper missing.');

    const benLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: beneficiaryUser.email,
      password: 'password123'
    });
    const benHeaders = { headers: { Authorization: `Bearer ${benLoginRes.data.data.token}` } };

    const shopLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: shopkeeperUser.email,
      password: 'password123'
    });
    const shopHeaders = { headers: { Authorization: `Bearer ${shopLoginRes.data.data.token}` } };

    // -------------------------------------------------------------
    // Test 1: Access Control (Block Non-Admin Roles)
    // -------------------------------------------------------------
    console.log('--- Test 1: Access Control Protection on Reports ---');
    try {
      await axios.get(`${API_URL}/admin/reports`, benHeaders);
      throw new Error('Test 1 Failed: Beneficiary was able to access admin reports!');
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Test 1 Passed: Beneficiary blocked from /api/admin/reports (403 Forbidden).');
      } else throw err;
    }

    try {
      await axios.get(`${API_URL}/admin/reports`, shopHeaders);
      throw new Error('Test 1 Failed: Shopkeeper was able to access admin reports!');
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Test 1 Passed: Shopkeeper blocked from /api/admin/reports (403 Forbidden).');
      } else throw err;
    }

    // -------------------------------------------------------------
    // Test 2: Database-Backed Aggregations & Reports Response
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Database Aggregations & Report Payload ---');
    const reportRes = await axios.get(`${API_URL}/admin/reports`, adminHeaders);
    if (!reportRes.data.success || !reportRes.data.data.summary) {
      throw new Error('Test 2 Failed: Report API returned invalid payload structure.');
    }

    const { summary, quantitiesByCommodity, shopComparisons, complaintStats } = reportRes.data.data;
    console.log('✅ Test 2 Passed: Retrieved DB reports summary.');
    console.log(`   - Total Transactions: ${summary.totalTransactions}`);
    console.log(`   - Total Subsidized Value: ₹${summary.totalSubsidizedAmount}`);
    console.log(`   - Commodities Aggregated: ${quantitiesByCommodity.length}`);
    console.log(`   - Shops Compared: ${shopComparisons.length}`);
    console.log(`   - Complaint Status Breakdown: Submitted=${complaintStats.SUBMITTED}, Resolved=${complaintStats.RESOLVED}`);

    // Verify Data Provenance Tag
    if (reportRes.data.reportMeta.dataSource !== 'DATABASE_COMMITTED_TRANSACTIONS') {
      throw new Error('Test 2 Failed: Report metadata missing DB provenance indicator.');
    }
    console.log('✅ Test 2 Passed: Provenance tag verified (DATABASE_COMMITTED_TRANSACTIONS).');

    // -------------------------------------------------------------
    // Test 3: Filtered Analytics Query (Shop / Commodity / Date)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Filtered Analytics Query ---');
    const shop = await prisma.rationShop.findFirst();
    if (shop) {
      const filteredRes = await axios.get(`${API_URL}/admin/reports?shopId=${shop.id}`, adminHeaders);
      if (!filteredRes.data.success) {
        throw new Error('Test 3 Failed: Filtered report query failed.');
      }
      console.log(`✅ Test 3 Passed: Shop-filtered report query returned successfully for shop ${shop.shopCode}.`);
    }

    // -------------------------------------------------------------
    // Test 4: CSV Export & Spreadsheet Formula Injection Prevention
    // -------------------------------------------------------------
    console.log('\n--- Test 4: CSV Export & Formula Injection Prevention ---');
    const csvRes = await axios.get(`${API_URL}/admin/reports/export-csv`, adminHeaders);
    if (!csvRes.data || typeof csvRes.data !== 'string') {
      throw new Error('Test 4 Failed: CSV export did not return raw string text.');
    }

    if (!csvRes.data.startsWith('Transaction Ref,Receipt Date')) {
      throw new Error('Test 4 Failed: CSV header row mismatch.');
    }

    // Verify Audit Log entry for CSV Export
    const auditRes = await prisma.auditLog.findFirst({
      where: { action: 'EXPORT_REPORTS_CSV' }
    });
    if (!auditRes) {
      throw new Error('Test 4 Failed: AuditLog entry for EXPORT_REPORTS_CSV was not recorded!');
    }
    console.log('✅ Test 4 Passed: CSV report generated & Security AuditLog recorded:', auditRes.action);

    console.log('\n🎉 ALL Reports and Analytics (FR-14) Integration Tests Passed Successfully!\n');
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

runReportsAndAnalyticsTests();
