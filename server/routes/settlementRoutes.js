import express from 'express';
import {
  markSettlementPaid,
  confirmSettlementReceipt,
  cancelSettlement,
} from '../controllers/settlementController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.put('/:settlementId/mark-paid', markSettlementPaid);
router.put('/:settlementId/confirm', confirmSettlementReceipt);
router.delete('/:settlementId', cancelSettlement);

export default router;

