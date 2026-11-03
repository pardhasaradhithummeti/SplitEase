/**
 * Utility to calculate individual user balances for a group.
 *
 * Balance Formula:
 * Net Balance = (Total amount paid for expenses by user - Total share of expenses for user)
 *              + (Total confirmed settlements paid by user - Total confirmed settlements received by user)
 *
 * A positive net balance means the user is owed money (creditor).
 * A negative net balance means the user owes money (debtor).
 * Zero means all settled.
 *
 * The sum of all net balances in a closed group always sums to 0.00.
 */

export const calculateGroupBalances = (members, expenses, confirmedSettlements = []) => {
  // Map of userId -> { user, paid: 0, share: 0, settlementsPaid: 0, settlementsReceived: 0, netBalance: 0 }
  const balances = {};

  // Initialize for all group members
  members.forEach((member) => {
    const id = (member._id || member).toString();
    balances[id] = {
      userId: id,
      user: typeof member === 'object' && member.name ? { _id: id, name: member.name, email: member.email } : id,
      paid: 0,
      share: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      netBalance: 0,
    };
  });

  // Accumulate expense payments and splits
  expenses.forEach((expense) => {
    const payerId = (expense.paidBy?._id || expense.paidBy).toString();
    const amountInCents = Math.round(Number(expense.amount || 0) * 100);

    // If payer is in group, add to paid
    if (balances[payerId]) {
      balances[payerId].paid += amountInCents;
    }

    // Accumulate each participant's share
    if (Array.isArray(expense.splits)) {
      expense.splits.forEach((split) => {
        const participantId = (split.user?._id || split.user).toString();
        const splitInCents = Math.round(Number(split.amount || 0) * 100);
        if (balances[participantId]) {
          balances[participantId].share += splitInCents;
        }
      });
    }
  });

  // Factor in confirmed settlements
  // Payer paid money outside app -> decreases their debt (adds to their net balance)
  // Receiver received money outside app -> decreases their credit (subtracts from their net balance)
  confirmedSettlements.forEach((settlement) => {
    if (settlement.status === 'completed') {
      const payerId = (settlement.payer?._id || settlement.payer).toString();
      const receiverId = (settlement.receiver?._id || settlement.receiver).toString();
      const settleInCents = Math.round(Number(settlement.amount || 0) * 100);

      if (balances[payerId]) {
        balances[payerId].settlementsPaid += settleInCents;
      }
      if (balances[receiverId]) {
        balances[receiverId].settlementsReceived += settleInCents;
      }
    }
  });

  // Calculate net balances and convert back to currency units (2 decimals)
  const result = Object.values(balances).map((entry) => {
    const netInCents = (entry.paid - entry.share) + (entry.settlementsPaid - entry.settlementsReceived);
    return {
      userId: entry.userId,
      user: entry.user,
      paid: entry.paid / 100,
      share: entry.share / 100,
      settlementsPaid: entry.settlementsPaid / 100,
      settlementsReceived: entry.settlementsReceived / 100,
      netBalance: Math.round(netInCents) / 100,
    };
  });

  return result;
};

