import express from 'express';
import {
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
} from '../controllers/invitationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(sendInvitation)
  .get(getMyInvitations);

router.put('/:id/accept', acceptInvitation);
router.put('/:id/reject', rejectInvitation);

export default router;

