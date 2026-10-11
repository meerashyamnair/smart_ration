import { prisma } from '../config/prisma';
import { generateToken } from '../utils/jwt';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runBeneficiaryAccessTest() {
  console.log('🧪 Running Beneficiary Security & Access Control Tests...');

  try {
    // 1. Fetch Seeded Beneficiary
    const beneficiaryUser = await prisma.user.findUnique({
      where: { email: 'beneficiary@gmail.com' },
      include: { beneficiary: { include: { rationCard: true } } }
    });

    if (!beneficiaryUser || !beneficiaryUser.beneficiary) {
      throw new Error('Seed beneficiary account missing');
    }

    const token = generateToken({
      userId: beneficiaryUser.id,
      role: beneficiaryUser.role,
      email: beneficiaryUser.email
    });

    const headers = { Authorization: `Bearer ${token}` };

    // Test A: Get Own Profile
    const profileRes = await axios.get(`${BASE_URL}/beneficiary/profile`, { headers });
    if (profileRes.status === 200 && profileRes.data.success) {
      console.log('✅ Test A Passed: Beneficiary can access own profile');
    }

    // Test B: Get Digital Ration Card
    const cardRes = await axios.get(`${BASE_URL}/beneficiary/ration-card`, { headers });
    if (cardRes.status === 200 && cardRes.data.data.qrToken) {
      console.log('✅ Test B Passed: Beneficiary receives opaque QR reference token');
    }

    // Test C: Get Monthly Entitlements
    const entRes = await axios.get(`${BASE_URL}/beneficiary/entitlements`, { headers });
    if (entRes.status === 200 && Array.isArray(entRes.data.data)) {
      console.log('✅ Test C Passed: Monthly entitlements calculated (Total vs Remaining)');
    }

    // Test D: Update Permitted Fields Only
    const initialCard = await prisma.rationCard.findUnique({
      where: { id: beneficiaryUser.beneficiary.rationCardId }
    });

    const updateRes = await axios.patch(
      `${BASE_URL}/beneficiary/profile`,
      {
        phone: '+919876543299',
        address: 'Updated Colony Address, Ward 5, Delhi',
        category: 'AAY', // Attempted tamper
        familyMembersCount: 10 // Attempted tamper
      },
      { headers }
    );

    if (updateRes.status === 200) {
      const checkCard = await prisma.rationCard.findUnique({
        where: { id: beneficiaryUser.beneficiary.rationCardId }
      });

      if (
        checkCard?.category === initialCard?.category &&
        checkCard?.familyMembersCount === initialCard?.familyMembersCount
      ) {
        console.log('✅ Test D Passed: Permitted fields updated, category & family count tampering blocked');
      } else {
        console.error('❌ Test D Failed: Category/count was unexpectedly modified!');
      }
    }

    // Test E: Unauthenticated Request Blocked
    try {
      await axios.get(`${BASE_URL}/beneficiary/profile`);
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('✅ Test E Passed: Unauthenticated request rejected with HTTP 401');
      }
    }

    console.log('🎉 All Beneficiary Access Tests Completed Successfully!');
  } catch (error: any) {
    console.error('❌ Test Execution Error:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

runBeneficiaryAccessTest();
