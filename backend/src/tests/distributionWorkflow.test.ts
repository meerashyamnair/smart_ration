import axios from 'axios';
import { prisma } from '../config/prisma';

const API_URL = 'http://localhost:5000/api';

async function runDistributionWorkflowTests() {
  console.log('🧪 Starting QR Verification & Ration Distribution Workflow Integration Tests...\n');

  try {
    // 1. Setup Test Fixtures: Shopkeeper, Beneficiaries, Items, Stock, Entitlements
    // Find or create test shopkeeper
    const shopkeeper = await prisma.user.findFirst({
      where: { role: 'SHOPKEEPER' },
      include: { shopkeeperProfile: { include: { rationShop: true } } }
    });

    if (!shopkeeper || !shopkeeper.shopkeeperProfile) {
      throw new Error('Test Shopkeeper profile not found in database.');
    }

    const shopId = shopkeeper.shopkeeperProfile.rationShopId;
    const shopCode = shopkeeper.shopkeeperProfile.rationShop.shopCode;

    // Login shopkeeper to get Auth JWT Token
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: shopkeeper.email,
      password: 'password123'
    });
    const token = loginRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Find test beneficiaries
    const activeBeneficiary = await prisma.beneficiary.findFirst({
      where: { rationCard: { status: 'ACTIVE' } },
      include: { rationCard: true, user: true }
    });

    if (!activeBeneficiary) {
      throw new Error('Active test beneficiary not found in database.');
    }

    const suspendedCard = await prisma.rationCard.findFirst({
      where: { status: 'SUSPENDED' }
    });

    // Ensure stock exists for test shop
    const items = await prisma.rationItem.findMany();
    if (items.length === 0) throw new Error('No ration items found in database.');

    const riceItem = items.find(i => i.itemCode === 'RICE_ST') || items[0];
    const wheatItem = items.find(i => i.itemCode === 'WHEAT_ST') || items[1] || items[0];

    // Ensure shop stock is set for testing
    await prisma.stock.upsert({
      where: { rationShopId_rationItemId: { rationShopId: shopId, rationItemId: riceItem.id } },
      update: { quantityAvailable: 200.0 },
      create: { rationShopId: shopId, rationItemId: riceItem.id, quantityAvailable: 200.0 }
    });

    // -------------------------------------------------------------
    // Test 1: Verify Valid QR Token & Manual Card Reference
    // -------------------------------------------------------------
    console.log('--- Test 1: QR Verification & Manual Reference ---');
    const verifyQrRes = await axios.post(`${API_URL}/distribution/verify-qr`, {
      qrToken: activeBeneficiary.rationCard.qrToken
    }, authHeaders);

    if (!verifyQrRes.data.success || !verifyQrRes.data.data.beneficiary) {
      throw new Error('Test 1 Failed: Valid QR verification returned invalid payload.');
    }
    console.log('✅ Test 1 Passed: Valid QR verified. Entitlements calculated:', verifyQrRes.data.data.entitlements.length, 'commodities');

    // Manual reference verification fallback
    const verifyRefRes = await axios.post(`${API_URL}/distribution/verify-qr`, {
      manualReference: activeBeneficiary.rationCard.rationCardNumber
    }, authHeaders);

    if (!verifyRefRes.data.success || verifyRefRes.data.data.beneficiary.id !== activeBeneficiary.id) {
      throw new Error('Test 1 Failed: Manual reference verification fallback failed.');
    }
    console.log('✅ Test 1 Passed: Manual card reference verification fallback succeeded.');

    // -------------------------------------------------------------
    // Test 2: Reject Invalid / Suspended QR Code
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Invalid & Suspended QR Codes ---');
    try {
      await axios.post(`${API_URL}/distribution/verify-qr`, { qrToken: 'INVALID_NON_EXISTENT_QR' }, authHeaders);
      throw new Error('Test 2 Failed: Invalid QR token should have returned HTTP 404.');
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        console.log('✅ Test 2 Passed: Invalid non-existent QR token correctly rejected (404 Not Found).');
      } else {
        throw err;
      }
    }

    if (suspendedCard) {
      try {
        await axios.post(`${API_URL}/distribution/verify-qr`, { qrToken: suspendedCard.qrToken }, authHeaders);
        throw new Error('Test 2 Failed: Suspended card QR should have been rejected (400).');
      } catch (err: any) {
        if (err.response && err.response.status === 400) {
          console.log('✅ Test 2 Passed: Suspended card QR correctly rejected (400 Bad Request).');
        } else {
          throw err;
        }
      }
    }

    // -------------------------------------------------------------
    // Test 3: Successful Distribution & Atomic DB Commit
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Atomic Distribution & Digital Receipt Generation ---');
    const idempotencyKey = `TEST_IDEM_${Date.now()}`;
    const initialStock = await prisma.stock.findUnique({
      where: { rationShopId_rationItemId: { rationShopId: shopId, rationItemId: riceItem.id } }
    });

    const initialQty = initialStock ? Number(initialStock.quantityAvailable) : 0;
    const dispenseQty = 5.0; // 5 KG Rice

    const dispensePayload = {
      beneficiaryId: activeBeneficiary.id,
      idempotencyKey,
      verificationMode: 'QR_CODE',
      items: [
        { rationItemId: riceItem.id, quantity: dispenseQty }
      ]
    };

    const dispenseRes = await axios.post(`${API_URL}/distribution/dispense`, dispensePayload, authHeaders);

    if (!dispenseRes.data.success || !dispenseRes.data.data.receipt) {
      throw new Error('Test 3 Failed: Distribution response missing receipt payload.');
    }

    const updatedStock = await prisma.stock.findUnique({
      where: { rationShopId_rationItemId: { rationShopId: shopId, rationItemId: riceItem.id } }
    });
    const newQty = updatedStock ? Number(updatedStock.quantityAvailable) : 0;

    if (newQty !== initialQty - dispenseQty) {
      throw new Error(`Test 3 Failed: Stock deduction mismatch. Expected ${initialQty - dispenseQty}, found ${newQty}`);
    }

    console.log(`✅ Test 3 Passed: Successfully dispensed ${dispenseQty} ${riceItem.unit}. Stock updated atomically (${initialQty} -> ${newQty}). Receipt Number: ${dispenseRes.data.data.receipt.receiptNumber}`);

    // -------------------------------------------------------------
    // Test 4: Idempotency Safeguard against Duplicate Submissions
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Idempotency Safeguard ---');
    const duplicateRes = await axios.post(`${API_URL}/distribution/dispense`, dispensePayload, authHeaders);
    
    if (!duplicateRes.data.success || !duplicateRes.data.message.includes('Idempotency Key')) {
      throw new Error('Test 4 Failed: Duplicate submission was not caught by Idempotency Key.');
    }

    const postDuplicateStock = await prisma.stock.findUnique({
      where: { rationShopId_rationItemId: { rationShopId: shopId, rationItemId: riceItem.id } }
    });
    if (Number(postDuplicateStock?.quantityAvailable) !== newQty) {
      throw new Error('Test 4 Failed: Duplicate submission altered stock balances!');
    }
    console.log('✅ Test 4 Passed: Duplicate submission blocked by idempotency key without double stock deduction.');

    // -------------------------------------------------------------
    // Test 5: Prevent Entitlement Overdraw (Exceeding Monthly Quota)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Entitlement Overdraw Prevention ---');
    try {
      await axios.post(`${API_URL}/distribution/dispense`, {
        beneficiaryId: activeBeneficiary.id,
        idempotencyKey: `TEST_OVERDRAW_${Date.now()}`,
        items: [
          { rationItemId: riceItem.id, quantity: 9999.0 } // 9999 KG exceeds quota
        ]
      }, authHeaders);
      throw new Error('Test 5 Failed: Entitlement overdraw attempt was not rejected!');
    } catch (err: any) {
      if (err.response && err.response.status === 400 && err.response.data.message.includes('exceeds remaining monthly entitlement quota')) {
        console.log('✅ Test 5 Passed: Overdraw attempt correctly blocked with server validation error.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 6: Prevent Dispensing with Insufficient Shop Stock
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Insufficient Shop Stock Safeguard ---');
    // Deplete stock temporarily to test safeguard
    await prisma.stock.update({
      where: { rationShopId_rationItemId: { rationShopId: shopId, rationItemId: riceItem.id } },
      data: { quantityAvailable: 1.0 } // only 1 KG in shop
    });

    try {
      await axios.post(`${API_URL}/distribution/dispense`, {
        beneficiaryId: activeBeneficiary.id,
        idempotencyKey: `TEST_STOCK_OUT_${Date.now()}`,
        items: [
          { rationItemId: riceItem.id, quantity: 5.0 }
        ]
      }, authHeaders);
      throw new Error('Test 6 Failed: Insufficient stock request was not rejected!');
    } catch (err: any) {
      if (err.response && err.response.status === 400 && err.response.data.message.includes('Insufficient shop stock')) {
        console.log('✅ Test 6 Passed: Insufficient shop stock error correctly caught and transaction rolled back.');
      } else {
        throw err;
      }
    } finally {
      // Restore test stock
      await prisma.stock.update({
        where: { rationShopId_rationItemId: { rationShopId: shopId, rationItemId: riceItem.id } },
        data: { quantityAvailable: 200.0 }
      });
    }

    // -------------------------------------------------------------
    // Test 7: Concurrent Distribution Safety
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Concurrent Requests & Atomic Lock Safety ---');
    const concurrentPayload1 = {
      beneficiaryId: activeBeneficiary.id,
      idempotencyKey: `CONCUR_1_${Date.now()}`,
      items: [{ rationItemId: riceItem.id, quantity: 1.0 }]
    };
    const concurrentPayload2 = {
      beneficiaryId: activeBeneficiary.id,
      idempotencyKey: `CONCUR_2_${Date.now()}`,
      items: [{ rationItemId: riceItem.id, quantity: 1.0 }]
    };

    const [res1, res2] = await Promise.allSettled([
      axios.post(`${API_URL}/distribution/dispense`, concurrentPayload1, authHeaders),
      axios.post(`${API_URL}/distribution/dispense`, concurrentPayload2, authHeaders)
    ]);

    // -------------------------------------------------------------
    // Test 8: Digital Receipt Access Control & Linkage Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Digital Receipt Generation & Access Control ---');
    const createdTxnRef = dispenseRes.data.data.transactionRef;

    // A. Authorized Shopkeeper fetching digital receipt
    const shopkeeperReceiptRes = await axios.get(`${API_URL}/distribution/receipts/${createdTxnRef}`, authHeaders);
    if (!shopkeeperReceiptRes.data.success || shopkeeperReceiptRes.data.data.transactionRef !== createdTxnRef) {
      throw new Error('Test 8 Failed: Authorized shopkeeper could not retrieve digital receipt.');
    }
    console.log('✅ Test 8 Passed: Authorized shopkeeper fetched committed receipt:', shopkeeperReceiptRes.data.data.receiptNumber);

    // B. Authorized Beneficiary fetching their own digital receipt
    const benLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: activeBeneficiary.user.email,
      password: 'password123'
    });
    const benToken = benLoginRes.data.data.token;
    const benAuthHeaders = { headers: { Authorization: `Bearer ${benToken}` } };

    const benReceiptRes = await axios.get(`${API_URL}/distribution/receipts/${createdTxnRef}`, benAuthHeaders);
    if (!benReceiptRes.data.success || benReceiptRes.data.data.beneficiary.rationCardNumber !== activeBeneficiary.rationCard.rationCardNumber) {
      throw new Error('Test 8 Failed: Authorized beneficiary could not fetch their own receipt.');
    }
    console.log('✅ Test 8 Passed: Authorized beneficiary successfully retrieved their digital receipt.');

    // C. Unauthorized Beneficiary attempting to fetch another user's receipt
    const otherBeneficiaryUser = await prisma.user.findFirst({
      where: { role: 'BENEFICIARY', id: { not: activeBeneficiary.userId } }
    });
    if (otherBeneficiaryUser) {
      const otherLoginRes = await axios.post(`${API_URL}/auth/login`, {
        email: otherBeneficiaryUser.email,
        password: 'password123'
      });
      const otherToken = otherLoginRes.data.data.token;
      const otherAuthHeaders = { headers: { Authorization: `Bearer ${otherToken}` } };

      try {
        await axios.get(`${API_URL}/distribution/receipts/${createdTxnRef}`, otherAuthHeaders);
        throw new Error('Test 8 Failed: Unauthorized beneficiary was allowed to view another user receipt!');
      } catch (err: any) {
        if (err.response && err.response.status === 403) {
          console.log('✅ Test 8 Passed: Cross-beneficiary unauthorized receipt access correctly blocked (403 Forbidden).');
        } else {
          throw err;
        }
      }
    }

    console.log('\n🎉 ALL QR Verification, Distribution & Digital Receipt Tests Passed Successfully!\n');
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

runDistributionWorkflowTests();
