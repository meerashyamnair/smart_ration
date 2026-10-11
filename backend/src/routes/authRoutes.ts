import { Router } from 'express';
import { registerBeneficiary, login, getMe } from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { LoginSchema, RegisterBeneficiarySchema } from 'shared';

const router = Router();

router.post('/register', authRateLimiter, validate(RegisterBeneficiarySchema), registerBeneficiary);
router.post('/login', authRateLimiter, validate(LoginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
