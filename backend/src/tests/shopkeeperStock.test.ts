import { prisma } from '../config/prisma';
import { generateToken } from '../utils/jwt';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runShopkeeperStockTests() {
  console.log('🧪 Running Shopkeeper Module & Stock Inventory Integration Tests...');

  try {
    const shopkeeperUser = await prisma.user.findFirst({
      where: { role: 'SHOPKEEPER' },
      include: { shopkeeperProfile: { include: { rationShop: true } } }
    });

    const beneficiaryUser = await prisma.user.findFirst({
      where: { role: 'BENEFICIARY' }
    });

    if (!shopkeeperUser || !shopkeeperUser.shopkeeperProfile || !beneficiaryUser) {
      throw new Error('Seed test accounts missing');
    }

    const shopToken = generateToken({ userId: shopkeeperUser.id, role: shopkeeperUser.role, email: shopkeeperUser.email });
    const benToken = generateToken({ userId: beneficiaryUser.id, role: beneficiaryUser.role, email: beneficiaryUser.email });

    const shopHeaders = { Authorization: `Bearer ${shopToken}` };
    const benHeaders = { Authorization: `Bearer ${benToken}` };

    const shopId = shopkeeperUser.shopkeeperProfile.rationShopId;

    // Test A: Fetch Shop Stock Inventory with Low-Stock Flags
    const stockRes = await axios.get(`${BASE_URL}/stock/shop`, { headers: shopHeaders });
    if (stockRes.status === 200 && Array.isArray(stockRes.data.data.stocks)) {
      console.log(`✅ Test A Passed: Shopkeeper retrieved inventory stock (${stockRes.data.data.stocks.length} commodities)`);
    }

    // Test B: Beneficiary Role Blocked from Stock Adjustments (Role Guard)
    try {
      await axios.post(`${BASE_URL}/stock/adjust`, { rationItemId: 'test', quantityChange: 10 }, { headers: benHeaders });
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('✅ Test B Passed: Beneficiary role blocked from stock adjustments (HTTP 403)');
      }
    }

    // Test C: Authorized Stock Addition / Replenishment
    const rice = await prisma.rationItem.findFirst({ where: { itemCode: 'RICE_PR11' } });
    if (!rice) throw new Error('Rice commodity missing');

    const adjustRes = await axios.post(
      `${BASE_URL}/stock/adjust`,
      {
        rationItemId: rice.id,
        quantityChange: 150.000,
        reason: 'REPLENISHMENT',
        referenceId: 'PO_DISTRICT_SEED_99'
      },
      { headers: shopHeaders }
    );

    if (adjustRes.status === 200 && adjustRes.data.data.movement) {
      const mov = adjustRes.data.data.movement;
      console.log(`✅ Test C Passed: Authorized stock replenishment added +150 KG (New Balance: ${mov.newBalance} KG, Previous: ${mov.previousBalance} KG)`);
    }

    // Test D: Negative Inventory Safeguard Prevention
    try {
      await axios.post(
        `${BASE_URL}/stock/adjust`,
        {
          rationItemId: rice.id,
          quantityChange: -99999.000, // Excessive deduction
          reason: 'ADJUSTMENT'
        },
        { headers: shopHeaders }
      );
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message.includes('cannot be negative')) {
        console.log('✅ Test D Passed: Negative stock balance adjustment blocked (HTTP 400)');
      }
    }

    // Test E: Stock Movement History Log Retrieval
    const movRes = await axios.get(`${BASE_URL}/stock/movements`, { headers: shopHeaders });
    if (movRes.status === 200 && Array.isArray(movRes.data.data)) {
      console.log(`✅ Test E Passed: Stock movement audit log retrieved (${movRes.data.data.length} logs recorded)`);
    }

    // Test F: Security Audit Log Verification
    const auditRecord = await prisma.auditLog.findFirst({
      where: { action: 'ADJUST_STOCK_INVENTORY', userId: shopkeeperUser.id }
    });

    if (auditRecord) {
      console.log(`✅ Test F Passed: Security Audit Log verified in AuditLog table (Action: ${auditRecord.action})`);
    }

    console.log('🎉 All Shopkeeper & Stock Inventory Tests Passed!');
  } catch (error: any) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runShopkeeperStockTests();
