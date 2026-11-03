import express from 'express';
import {
  createGroup,
  getMyGroups,
  getGroupById,
} from '../controllers/groupController.js';
import { addExpense } from '../controllers/expenseController.js';
import { createSettlement } from '../controllers/settlementController.js';
import { protect } from '../middleware/authMiddleware.js';
import { verifyGroupMembership } from '../middleware/groupMemberMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createGroup)
  .get(getMyGroups);

router.route('/:groupId')
  .get(verifyGroupMembership, getGroupById);

// Nested group resources
router.post('/:groupId/expenses', verifyGroupMembership, addExpense);
router.post('/:groupId/settlements', verifyGroupMembership, createSettlement);

export default router;

