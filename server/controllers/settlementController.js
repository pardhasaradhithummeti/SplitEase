import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';

// @desc    Create or record a settlement proposal
// @route   POST /api/groups/:groupId/settlements
// @access  Private
export const createSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { receiverId, amount, notes, markAsPaid } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid settlement amount is required' });
    }

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const payerId = req.user._id.toString();

    // Verify both payer and receiver are group members
    const isPayerMember = group.members.some((m) => m.toString() === payerId);
    const isReceiverMember = group.members.some((m) => m.toString() === receiverId.toString());

    if (!isPayerMember || !isReceiverMember) {
      return res.status(400).json({ message: 'Both payer and receiver must be members of the group' });
    }

    if (payerId === receiverId.toString()) {
      return res.status(400).json({ message: 'Payer and receiver cannot be the same user' });
    }

    // Determine initial status:
    // If payer immediately marks it as paid, status is 'awaiting_confirmation'.
    // Otherwise 'pending'.
    const initialStatus = markAsPaid ? 'awaiting_confirmation' : 'pending';

    const settlement = await Settlement.create({
      group: groupId,
      payer: req.user._id,
      receiver: receiverId,
      amount: Math.round(numAmount * 100) / 100,
      status: initialStatus,
      notes: notes ? notes.trim() : '',
      paidAt: markAsPaid ? new Date() : null,
      createdBy: req.user._id,
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', '_id name email')
      .populate('receiver', '_id name email')
      .populate('createdBy', '_id name email');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Payer marks settlement as paid -> awaiting_confirmation
// @route   PUT /api/settlements/:settlementId/mark-paid
// @access  Private
export const markSettlementPaid = async (req, res, next) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    // Only the payer can mark as paid
    if (settlement.payer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the designated payer can mark this settlement as paid' });
    }

    if (settlement.status === 'completed') {
      return res.status(400).json({ message: 'Settlement is already completed' });
    }

    settlement.status = 'awaiting_confirmation';
    settlement.paidAt = new Date();
    await settlement.save();

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', '_id name email')
      .populate('receiver', '_id name email')
      .populate('createdBy', '_id name email');

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Receiver confirms receipt of settlement -> completed
// @route   PUT /api/settlements/:settlementId/confirm
// @access  Private
export const confirmSettlementReceipt = async (req, res, next) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    // Security: ONLY the receiver can confirm receipt
    if (settlement.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the receiver can confirm receipt of this settlement' });
    }

    if (settlement.status === 'completed') {
      return res.status(400).json({ message: 'Settlement is already confirmed and completed' });
    }

    settlement.status = 'completed';
    settlement.confirmedAt = new Date();
    await settlement.save();

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', '_id name email')
      .populate('receiver', '_id name email')
      .populate('createdBy', '_id name email');

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel or delete settlement proposal
// @route   DELETE /api/settlements/:settlementId
// @access  Private
export const cancelSettlement = async (req, res, next) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    // Only payer, receiver, or creator can cancel
    const isAuthorized =
      settlement.payer.toString() === req.user._id.toString() ||
      settlement.receiver.toString() === req.user._id.toString() ||
      settlement.createdBy.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to cancel this settlement' });
    }

    if (settlement.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel an already completed settlement' });
    }

    await Settlement.findByIdAndDelete(settlementId);

    res.status(200).json({ message: 'Settlement proposal cancelled' });
  } catch (error) {
    next(error);
  }
};

