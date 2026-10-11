import { Router } from 'express';
import { submitComplaint, getMyComplaints, getAllComplaintsAdmin, resolveComplaint } from '../controllers/complaintController';
import { authenticate, authorize } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { SubmitComplaintSchema } from 'shared';

const router = Router();

router.use(authenticate);

router.post('/submit', authorize(['BENEFICIARY']), validate(SubmitComplaintSchema), submitComplaint);
router.get('/my-complaints', authorize(['BENEFICIARY']), getMyComplaints);
router.get('/all', authorize(['ADMIN']), getAllComplaintsAdmin);
router.patch('/:id/resolve', authorize(['ADMIN']), resolveComplaint);

export default router;
