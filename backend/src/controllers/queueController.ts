import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { NotificationService } from '../services/notificationService';
import { QueueStatus } from '@prisma/client';

const MAX_SLOT_CAPACITY = 15;

const DEFAULT_SLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00'
];

// 1. Get Available Slots with Capacity & Remaining Spots
export const getAvailableSlots = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookingDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const userId = req.user?.userId;

    let shopId: string | undefined;

    if (req.user?.role === 'BENEFICIARY') {
      const beneficiary = await prisma.beneficiary.findUnique({
        where: { userId },
        include: { rationCard: true }
      });
      shopId = beneficiary?.rationCard?.rationShopId;
    } else if (req.user?.role === 'SHOPKEEPER') {
      const shopProf = await prisma.shopkeeperProfile.findUnique({ where: { userId } });
      shopId = shopProf?.rationShopId;
    }

    if (!shopId) {
      const firstShop = await prisma.rationShop.findFirst();
      shopId = firstShop?.id;
    }

    // Fetch existing active bookings for shop & date
    const activeBookings = await prisma.queueBooking.findMany({
      where: {
        rationShopId: shopId,
        bookingDate,
        status: QueueStatus.BOOKED
      },
      select: { timeSlot: true }
    });

    // Count bookings per slot
    const slotCounts: { [slot: string]: number } = {};
    activeBookings.forEach(b => {
      slotCounts[b.timeSlot] = (slotCounts[b.timeSlot] || 0) + 1;
    });

    const slotsWithCapacity = DEFAULT_SLOTS.map(slot => {
      const bookedCount = slotCounts[slot] || 0;
      const remainingCapacity = Math.max(0, MAX_SLOT_CAPACITY - bookedCount);
      return {
        timeSlot: slot,
        bookedCount,
        maxCapacity: MAX_SLOT_CAPACITY,
        remainingCapacity,
        isFull: remainingCapacity === 0
      };
    });

    res.json({
      success: true,
      data: {
        bookingDate,
        rationShopId: shopId,
        slots: slotsWithCapacity
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Book Queue Slot
export const bookSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingDate, timeSlot } = req.body;
    const userId = req.user?.userId;

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { userId },
      include: { rationCard: { include: { rationShop: true } }, user: true }
    });

    if (!beneficiary || !beneficiary.rationCard) {
      return res.status(404).json({ success: false, message: 'Beneficiary ration card profile not found' });
    }

    const shopId = beneficiary.rationCard.rationShopId;

    // Safeguard A: Duplicate Active Booking Check for Same Date
    const duplicateBooking = await prisma.queueBooking.findFirst({
      where: {
        beneficiaryId: beneficiary.id,
        bookingDate,
        status: QueueStatus.BOOKED
      }
    });

    if (duplicateBooking) {
      return res.status(400).json({
        success: false,
        message: `Duplicate booking prevented. You already have an active reservation (Token #${duplicateBooking.tokenNumber}) on ${bookingDate}.`
      });
    }

    // Safeguard B: Slot Capacity Check
    const existingCount = await prisma.queueBooking.count({
      where: {
        rationShopId: shopId,
        bookingDate,
        timeSlot,
        status: QueueStatus.BOOKED
      }
    });

    if (existingCount >= MAX_SLOT_CAPACITY) {
      return res.status(400).json({
        success: false,
        message: `Slot overbooking prevented. Time slot ${timeSlot} on ${bookingDate} is fully booked (${MAX_SLOT_CAPACITY}/${MAX_SLOT_CAPACITY}).`
      });
    }

    const tokenNumber = existingCount + 1;

    // Create Booking
    const booking = await prisma.queueBooking.create({
      data: {
        beneficiaryId: beneficiary.id,
        rationShopId: shopId,
        bookingDate,
        timeSlot,
        tokenNumber,
        status: QueueStatus.BOOKED
      },
      include: { rationShop: true }
    });

    // Send Notification
    await NotificationService.send({
      userId: beneficiary.userId,
      title: 'Queue Slot Confirmed',
      message: `Your ration collection slot for ${bookingDate} (${timeSlot}) at ${beneficiary.rationCard.rationShop.shopName} has been confirmed. Token Number: #${tokenNumber}.`,
      type: 'QUEUE'
    });

    res.status(201).json({
      success: true,
      message: 'Queue slot booked successfully',
      data: {
        ...booking,
        fpsShop: booking.rationShop
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Cancel Active Booking
export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user?.userId;

    const beneficiary = await prisma.beneficiary.findUnique({ where: { userId } });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    const booking = await prisma.queueBooking.findFirst({
      where: { id, beneficiaryId: beneficiary.id }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Queue booking not found or unauthorized' });
    }

    if (booking.status !== QueueStatus.BOOKED) {
      return res.status(400).json({ success: false, message: `Cannot cancel a booking in '${booking.status}' status.` });
    }

    const updated = await prisma.queueBooking.update({
      where: { id },
      data: { status: QueueStatus.CANCELLED }
    });

    await NotificationService.send({
      userId: beneficiary.userId,
      title: 'Queue Booking Cancelled',
      message: `Your queue slot (Token #${booking.tokenNumber}) for ${booking.bookingDate} (${booking.timeSlot}) has been cancelled.`,
      type: 'QUEUE'
    });

    res.json({ success: true, message: 'Queue booking cancelled successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

// 4. Get My Bookings (Beneficiary)
export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const beneficiary = await prisma.beneficiary.findUnique({ where: { userId } });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    const bookings = await prisma.queueBooking.findMany({
      where: { beneficiaryId: beneficiary.id },
      include: { rationShop: true },
      orderBy: { createdAt: 'desc' }
    });

    const formattedBookings = bookings.map(b => ({
      ...b,
      fpsShop: b.rationShop
    }));

    res.json({ success: true, data: formattedBookings });
  } catch (error) {
    next(error);
  }
};

// 5. Get Shop Queue (Shopkeeper)
export const getShopQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const bookingDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const shopProfile = await prisma.shopkeeperProfile.findUnique({
      where: { userId },
      include: { rationShop: true }
    });

    if (!shopProfile) {
      return res.status(404).json({ success: false, message: 'Shopkeeper shop assignment not found' });
    }

    const bookings = await prisma.queueBooking.findMany({
      where: {
        rationShopId: shopProfile.rationShopId,
        bookingDate
      },
      include: {
        beneficiary: { include: { user: true, rationCard: true } }
      },
      orderBy: [{ timeSlot: 'asc' }, { tokenNumber: 'asc' }]
    });

    res.json({
      success: true,
      data: {
        shop: shopProfile.rationShop,
        date: bookingDate,
        queue: bookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Update Booking Status (Shopkeeper: Mark Completed / Missed)
export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    const booking = await prisma.queueBooking.update({
      where: { id },
      data: { status: status as QueueStatus },
      include: { beneficiary: true }
    });

    if (booking.beneficiary) {
      await NotificationService.send({
        userId: booking.beneficiary.userId,
        title: `Queue Token Status: ${status}`,
        message: `Your queue token #${booking.tokenNumber} for ${booking.bookingDate} has been marked as ${status}.`,
        type: 'QUEUE'
      });
    }

    res.json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    next(error);
  }
};
