import Expense from '../models/Expense.js';
import Group from '../models/Group.js';

// Helper to validate and calculate splits
const buildSplits = (totalAmount, splitType, participants, customSplits) => {
  const totalCents = Math.round(Number(totalAmount) * 100);

  if (totalCents <= 0) {
    throw new Error('Total amount must be greater than zero');
  }

  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    throw new Error('At least one participant must share the expense');
  }

  if (splitType === 'equal') {
    const count = participants.length;
    const baseShareCents = Math.floor(totalCents / count);
    const remainderCents = totalCents % count;

    // Distribute base cents, giving remainder cents to the first few participants
    return participants.map((userId, idx) => {
      const shareCents = baseShareCents + (idx < remainderCents ? 1 : 0);
      return {
        user: userId,
        amount: shareCents / 100,
      };
    });
  } else if (splitType === 'custom') {
    if (!customSplits || typeof customSplits !== 'object') {
      throw new Error('Custom split amounts are required for custom splitting');
    }

    let calculatedSumCents = 0;
    const splits = participants.map((userId) => {
      const share = Number(customSplits[userId] || 0);
      if (share < 0) {
        throw new Error('Split amounts cannot be negative');
      }
      const shareCents = Math.round(share * 100);
      calculatedSumCents += shareCents;
      return {
        user: userId,
        amount: shareCents / 100,
      };
    });

    if (calculatedSumCents !== totalCents) {
      const diff = (calculatedSumCents - totalCents) / 100;
      throw new Error(
        `Custom splits total (₹${(calculatedSumCents / 100).toFixed(2)}) must equal expense amount (₹${(totalCents / 100).toFixed(2)}). Difference: ₹${diff.toFixed(2)}`
      );
    }

    return splits;
  } else {
    throw new Error('Invalid split type. Must be equal or custom');
  }
};

// @desc    Add a new expense to a group
// @route   POST /api/groups/:groupId/expenses
// @access  Private
export const addExpense = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { description, amount, paidBy, splitType = 'equal', participants, customSplits, date } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Expense description is required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid positive amount' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Verify current user is group member
    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Verify payer is in group
    const payerId = paidBy || req.user._id;
    const isPayerMember = group.members.some(
      (m) => m.toString() === payerId.toString()
    );
    if (!isPayerMember) {
      return res.status(400).json({ message: 'Selected payer is not a member of this group' });
    }

    // Ensure all participants are group members
    const participantList = participants && participants.length > 0
      ? participants
      : group.members.map((m) => m.toString());

    for (const pId of participantList) {
      if (!group.members.some((m) => m.toString() === pId.toString())) {
        return res.status(400).json({ message: `Participant ${pId} is not a member of this group` });
      }
    }

    // Build splits
    let splits;
    try {
      splits = buildSplits(numAmount, splitType, participantList, customSplits);
    } catch (splitErr) {
      return res.status(400).json({ message: splitErr.message });
    }

    const expense = await Expense.create({
      group: groupId,
      description: description.trim(),
      amount: Math.round(numAmount * 100) / 100,
      paidBy: payerId,
      splitType,
      splits,
      date: date ? new Date(date) : new Date(),
      createdBy: req.user._id,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', '_id name email')
      .populate('splits.user', '_id name email')
      .populate('createdBy', '_id name email');

    res.status(201).json(populatedExpense);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an expense (only creator or payer can update)
// @route   PUT /api/expenses/:expenseId
// @access  Private
export const updateExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { description, amount, paidBy, splitType, participants, customSplits, date } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Verify ownership: only createdBy or paidBy can edit
    const isOwner =
      expense.createdBy.toString() === req.user._id.toString() ||
      expense.paidBy.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({ message: 'Access denied: You can only edit expenses you created or paid for' });
    }

    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Associated group not found' });
    }

    // If payer changed, check group membership
    const newPayerId = paidBy || expense.paidBy;
    const isPayerMember = group.members.some(
      (m) => m.toString() === newPayerId.toString()
    );
    if (!isPayerMember) {
      return res.status(400).json({ message: 'Selected payer is not a member of this group' });
    }

    const targetAmount = amount !== undefined ? Number(amount) : expense.amount;
    const targetSplitType = splitType || expense.splitType;
    const targetParticipants = participants || expense.splits.map((s) => s.user.toString());

    let newSplits;
    try {
      newSplits = buildSplits(targetAmount, targetSplitType, targetParticipants, customSplits);
    } catch (splitErr) {
      return res.status(400).json({ message: splitErr.message });
    }

    if (description) expense.description = description.trim();
    expense.amount = Math.round(targetAmount * 100) / 100;
    expense.paidBy = newPayerId;
    expense.splitType = targetSplitType;
    expense.splits = newSplits;
    if (date) expense.date = new Date(date);

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', '_id name email')
      .populate('splits.user', '_id name email')
      .populate('createdBy', '_id name email');

    res.status(200).json(populatedExpense);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an expense (only creator or payer can delete)
// @route   DELETE /api/expenses/:expenseId
// @access  Private
export const deleteExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Verify ownership: only createdBy or paidBy can delete
    const isOwner =
      expense.createdBy.toString() === req.user._id.toString() ||
      expense.paidBy.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({ message: 'Access denied: You can only delete expenses you created or paid for' });
    }

    await Expense.findByIdAndDelete(expenseId);

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

