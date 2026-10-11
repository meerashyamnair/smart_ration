import { Router } from 'express';
import {
  getAvailableSlots,
  bookSlot,
  cancelBooking,
  getMyBookings,
  getShopQueue,
  updateBookingStatus
} from '../controllers/queueController';
import { authenticate, authorize, verifyShopkeeperShopAccess } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { BookQueueSchema } from 'shared';

const router = Router();

router.use(authenticate);

router.get('/slots', getAvailableSlots);
router.post('/book', authorize(['BENEFICIARY']), validate(BookQueueSchema), bookSlot);
router.patch('/cancel/:id', authorize(['BENEFICIARY']), cancelBooking);
router.get('/my-bookings', authorize(['BENEFICIARY']), getMyBookings);

// Shopkeeper Queue Endpoints
router.get('/shop-queue', authorize(['SHOPKEEPER', 'ADMIN']), verifyShopkeeperShopAccess, getShopQueue);
router.patch('/status/:id', authorize(['SHOPKEEPER', 'ADMIN']), updateBookingStatus);

export default router;
