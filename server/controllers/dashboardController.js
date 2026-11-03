import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import Invitation from '../models/Invitation.js';
import { calculateGroupBalances } from '../utils/balanceCalculator.js';

// @desc    Get dashboard metrics and activity for current user
// @route   GET /api/dashboard
// @access  Private
export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    // 1. Fetch all groups where user is a member
    const groups = await Group.find({ members: req.user._id }).populate('members', '_id name email');
    const groupIds = groups.map((g) => g._id);

    let totalYouOweCents = 0;
    let totalYouAreOwedCents = 0;

    // 2. Calculate user's net position across each group
    for (const group of groups) {
      const expenses = await Expense.find({ group: group._id });
      const settlements = await Settlement.find({ group: group._id, status: 'completed' });

      const memberBalances = calculateGroupBalances(group.members, expenses, settlements);
      const myBalance = memberBalances.find((b) => b.userId === userId);

      if (myBalance) {
        if (myBalance.netBalance > 0) {
          totalYouAreOwedCents += Math.round(myBalance.netBalance * 100);
        } else if (myBalance.netBalance < 0) {
          totalYouOweCents += Math.round(Math.abs(myBalance.netBalance) * 100);
        }
      }
    }

    // 3. Fetch recent expenses across user's groups (up to 8)
    const recentExpenses = await Expense.find({ group: { $in: groupIds } })
      .populate('group', 'name')
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .limit(8);

    // 4. Fetch pending invitations count
    const pendingInvitationsCount = await Invitation.countDocuments({
      recipient: req.user._id,
      status: 'pending',
    });

    // 5. Fetch recent settlement activity involving the user (awaiting confirmation, recent completed)
    const pendingSettlements = await Settlement.find({
      group: { $in: groupIds },
      $or: [{ payer: req.user._id }, { receiver: req.user._id }],
      status: { $in: ['pending', 'awaiting_confirmation'] },
    })
      .populate('group', 'name')
      .populate('payer', 'name email')
      .populate('receiver', 'name email')
      .sort({ updatedAt: -1 })
      .limit(5);

    res.status(200).json({
      totalOwed: totalYouOweCents / 100, // Amount user owes to others
      totalOwedToYou: totalYouAreOwedCents / 100, // Amount others owe to user
      netBalance: (totalYouAreOwedCents - totalYouOweCents) / 100,
      groupsCount: groups.length,
      pendingInvitationsCount,
      recentExpenses,
      pendingSettlements,
    });
  } catch (error) {
    next(error);
  }
};

