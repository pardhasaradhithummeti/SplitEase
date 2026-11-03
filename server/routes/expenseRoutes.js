import express from 'express';
import {
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/:expenseId')
  .put(updateExpense)
  .delete(deleteExpense);

export default router;

