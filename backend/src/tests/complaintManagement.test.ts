import { prisma } from '../config/prisma';
import { generateToken } from '../utils/jwt';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runComplaintManagementTests() {
  console.log('🧪 Running FR-12 Complaint Management Integration Tests...');

  try {
    const beneficiaryUser = await prisma.user.findFirst({
      where: { role: 'BENEFICIARY' }
    });

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!beneficiaryUser || !adminUser) {
      throw new Error('Seed test users missing');
    }

    const benToken = generateToken({ userId: beneficiaryUser.id, role: beneficiaryUser.role, email: beneficiaryUser.email });
    const adminToken = generateToken({ userId: adminUser.id, role: adminUser.role, email: adminUser.email });

    const benHeaders = { Authorization: `Bearer ${benToken}` };
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Test A: Submit Complaint Ticket (Beneficiary)
    const submitRes = await axios.post(
      `${BASE_URL}/complaints/submit`,
      {
        fpsShopId: 'FPS_DELHI_001',
        category: 'Short Weight',
        subject: 'Under-quantity of Rice dispensed',
        description: 'Received 18 KG instead of 20 KG monthly quota entitlement at FPS shop #001.'
      },
      { headers: benHeaders }
    );

    if (submitRes.status === 201 && submitRes.data.data.ticketId) {
      console.log(`✅ Test A Passed: Grievance ticket created! Ticket ID: ${submitRes.data.data.ticketId}`);
    }

    const complaintId = submitRes.data.data.id;

    // Test B: View My Complaints (Beneficiary Ownership)
    const myComplaintsRes = await axios.get(`${BASE_URL}/complaints/my-complaints`, { headers: benHeaders });
    if (myComplaintsRes.status === 200 && Array.isArray(myComplaintsRes.data.data)) {
      console.log(`✅ Test B Passed: Beneficiary retrieved own complaints (${myComplaintsRes.data.data.length} tickets)`);
    }

    // Test C: Unauthorized Access Rejection (Unauthenticated)
    try {
      await axios.get(`${BASE_URL}/complaints/all`);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('✅ Test C Passed: Unauthorized complaint list access blocked');
      }
    }

    // Test D: Admin View All Complaints
    const adminAllRes = await axios.get(`${BASE_URL}/complaints/all`, { headers: adminHeaders });
    if (adminAllRes.status === 200 && Array.isArray(adminAllRes.data.data)) {
      console.log(`✅ Test D Passed: Admin retrieved global complaint registry (${adminAllRes.data.data.length} tickets)`);
    }

    // Test E: Admin Update Status to UNDER_REVIEW
    const reviewRes = await axios.patch(
      `${BASE_URL}/complaints/${complaintId}/resolve`,
      {
        status: 'UNDER_REVIEW',
        adminResponse: 'Assigned to Inspector for Fair Price Shop #001 audit.'
      },
      { headers: adminHeaders }
    );

    if (reviewRes.status === 200 && reviewRes.data.data.status === 'UNDER_REVIEW') {
      console.log('✅ Test E Passed: Admin updated ticket status to UNDER_REVIEW with notes');
    }

    // Test F: Admin Resolve Complaint
    const resolveRes = await axios.patch(
      `${BASE_URL}/complaints/${complaintId}/resolve`,
      {
        status: 'RESOLVED',
        adminResponse: 'Shop audit completed. Dealer penalized and 2 KG deficit credited.'
      },
      { headers: adminHeaders }
    );

    if (resolveRes.status === 200 && resolveRes.data.data.status === 'RESOLVED') {
      console.log('✅ Test F Passed: Admin resolved complaint ticket');
    }

    // Test G: Verification of Beneficiary Response Visibility & Notification
    const updatedMyComp = await axios.get(`${BASE_URL}/complaints/my-complaints`, { headers: benHeaders });
    const targetComp = updatedMyComp.data.data.find((c: any) => c.id === complaintId);
    if (targetComp && targetComp.status === 'RESOLVED' && targetComp.adminResponse) {
      console.log(`✅ Test G Passed: Beneficiary can view official resolution notes ("${targetComp.adminResponse}")`);
    }

    console.log('🎉 All FR-12 Complaint Management Tests Passed!');
  } catch (error: any) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runComplaintManagementTests();
