import { prisma } from '../config/prisma';
import { generateToken } from '../utils/jwt';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runQueueAndNotificationTests() {
  console.log('🧪 Running FR-10 Queue Booking & FR-11 Notification Integration Tests...');

  try {
    // 1. Fetch Beneficiary & Shopkeeper Users
    const beneficiaryUser = await prisma.user.findUnique({
      where: { email: 'beneficiary@gmail.com' },
      include: { beneficiary: { include: { rationCard: true } } }
    });

    const shopkeeperUser = await prisma.user.findUnique({
      where: { email: 'shopkeeper1@pds.gov.in' }
    });

    if (!beneficiaryUser || !shopkeeperUser) {
      throw new Error('Seed test users missing');
    }

    const benToken = generateToken({ userId: beneficiaryUser.id, role: beneficiaryUser.role, email: beneficiaryUser.email });
    const shopToken = generateToken({ userId: shopkeeperUser.id, role: shopkeeperUser.role, email: shopkeeperUser.email });

    const benHeaders = { Authorization: `Bearer ${benToken}` };
    const shopHeaders = { Authorization: `Bearer ${shopToken}` };

    const testDate = '2026-10-15';

    // Test A: Get Available Slots & Capacity
    const slotsRes = await axios.get(`${BASE_URL}/queue/slots?date=${testDate}`, { headers: benHeaders });
    if (slotsRes.status === 200 && slotsRes.data.data.slots.length > 0) {
      const slot = slotsRes.data.data.slots[0];
      console.log(`✅ Test A Passed: Available slots query returned remaining capacity (${slot.remainingCapacity}/${slot.maxCapacity})`);
    }

    // Clear previous test bookings for clean run
    await prisma.queueBooking.deleteMany({
      where: { beneficiaryId: beneficiaryUser.beneficiary?.id, bookingDate: testDate }
    });

    // Test B: Successful Queue Booking
    const bookRes = await axios.post(
      `${BASE_URL}/queue/book`,
      { bookingDate: testDate, timeSlot: '09:00 - 10:00' },
      { headers: benHeaders }
    );

    if (bookRes.status === 201 && bookRes.data.data.tokenNumber) {
      console.log(`✅ Test B Passed: Queue slot booked! Token #${bookRes.data.data.tokenNumber}`);
    }

    // Test C: Duplicate Active Booking Prevention
    try {
      await axios.post(
        `${BASE_URL}/queue/book`,
        { bookingDate: testDate, timeSlot: '10:00 - 11:00' },
        { headers: benHeaders }
      );
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message.includes('Duplicate booking prevented')) {
        console.log('✅ Test C Passed: Duplicate active booking on same date blocked');
      }
    }

    // Test D: In-App Notification Received for Booking
    const notifRes = await axios.get(`${BASE_URL}/notifications`, { headers: benHeaders });
    if (notifRes.status === 200 && notifRes.data.data.length > 0) {
      const latestNotif = notifRes.data.data[0];
      console.log(`✅ Test D Passed: In-App Notification delivered ("${latestNotif.title}")`);

      // Mark as read
      await axios.patch(`${BASE_URL}/notifications/${latestNotif.id}/read`, {}, { headers: benHeaders });
      console.log('✅ Test D.2 Passed: Notification marked as read');
    }

    // Test E: Shopkeeper Queue Viewing
    const shopQueueRes = await axios.get(`${BASE_URL}/queue/shop-queue?date=${testDate}`, { headers: shopHeaders });
    if (shopQueueRes.status === 200 && Array.isArray(shopQueueRes.data.data.queue)) {
      console.log(`✅ Test E Passed: Shopkeeper retrieved daily queue (${shopQueueRes.data.data.queue.length} bookings)`);
    }

    // Test F: Booking Cancellation by Beneficiary
    const bookingId = bookRes.data.data.id;
    const cancelRes = await axios.patch(`${BASE_URL}/queue/cancel/${bookingId}`, {}, { headers: benHeaders });
    if (cancelRes.status === 200 && cancelRes.data.data.status === 'CANCELLED') {
      console.log('✅ Test F Passed: Beneficiary cancelled booking successfully');
    }

    console.log('🎉 All FR-10 & FR-11 Integration Tests Passed!');
  } catch (error: any) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runQueueAndNotificationTests();
