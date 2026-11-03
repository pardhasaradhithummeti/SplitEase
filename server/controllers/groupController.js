import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import { calculateGroupBalances } from '../utils/balanceCalculator.js';
import { simplifyDebts } from '../utils/settlementAlgorithm.js';

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      creator: req.user._id,
      members: [req.user._id], // Creator is automatically first member
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('creator', '_id name email')
      .populate('members', '_id name email');

    res.status(201).json(populatedGroup);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all groups the logged-in user belongs to
// @route   GET /api/groups
// @access  Private
export const getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('creator', '_id name email')
      .populate('members', '_id name email')
      .sort({ updatedAt: -1 });

    // For each group, calculate the user's specific balance in that group
    const groupsWithBalances = await Promise.all(
      groups.map(async (group) => {
        const expenses = await Expense.find({ group: group._id });
        const settlements = await Settlement.find({ group: group._id, status: 'completed' });

        const balances = calculateGroupBalances(group.members, expenses, settlements);
        const myBalanceObj = balances.find(
          (b) => b.userId.toString() === req.user._id.toString()
        );

        const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          ...group.toObject(),
          myBalance: myBalanceObj ? myBalanceObj.netBalance : 0,
          totalExpensesCount: expenses.length,
          totalExpenseAmount: Math.round(totalExpenseAmount * 100) / 100,
        };
      })
    );

    res.status(200).json(groupsWithBalances);
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed group by ID with expenses, balances, and settlements
// @route   GET /api/groups/:groupId
// @access  Private
export const getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('creator', '_id name email')
      .populate('members', '_id name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Verify membership
    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this group' });
    }

    // Fetch expenses
    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', '_id name email')
      .populate('splits.user', '_id name email')
      .populate('createdBy', '_id name email')
      .sort({ date: -1, createdAt: -1 });

    // Fetch settlements
    const settlements = await Settlement.find({ group: groupId })
      .populate('payer', '_id name email')
      .populate('receiver', '_id name email')
      .populate('createdBy', '_id name email')
      .sort({ createdAt: -1 });

    // Calculate balances with completed settlements
    const balances = calculateGroupBalances(group.members, expenses, settlements);

    // Calculate suggested settlements
    const suggestedSettlements = simplifyDebts(balances);

    res.status(200).json({
      group,
      expenses,
      settlements,
      balances,
      suggestedSettlements,
    });
  } catch (error) {
    next(error);
  }
};

