/**
 * Simplified Debt Settlement Algorithm
 * 
 * Objective:
 * Given a list of participants and their net balances (where positive means
 * the person is owed money, and negative means the person owes money),
 * calculate a minimal set of direct settlement transactions (who pays whom how much)
 * so that all balances reach zero.
 * 
 * Algorithm: Greedy Matching
 * 1. Filter out participants with a balance of zero (within currency precision).
 * 2. Separate participants into two pools:
 *    - Creditors (net balance > 0)
 *    - Debtors (net balance < 0, converted to positive debt magnitude)
 * 3. Work in integer cents/paise to prevent IEEE 754 floating-point inaccuracies.
 * 4. Iteratively match the largest debtor with the largest creditor (or match iteratively):
 *    - Transfer amount = min(debtor.balance, creditor.balance)
 *    - Record the transaction: { from: debtor.user, to: creditor.user, amount }
 *    - Deduct transfer amount from debtor's balance and creditor's balance.
 *    - If debtor's remaining balance is 0, remove debtor.
 *    - If creditor's remaining balance is 0, remove creditor.
 * 5. Repeat until all balances are settled (<= 0.005 currency units).
 * 
 * Note on optimality:
 * This greedy algorithm is guaranteed to settle all debts in at most (N - 1) transactions,
 * where N is the number of participants with non-zero balances. Finding the absolute
 * theoretical minimum number of transactions across arbitrary subsets is an NP-hard problem
 * (reduction from the Subset Sum / Partition problem). The greedy algorithm provides an
 * intuitive, robust, and highly efficient O(N log N) settlement solution that avoids circular
 * or redundant debts.
 * 
 * @param {Array<{ userId: string, user: any, netBalance: number }>} balances
 * @returns {Array<{ fromUser: any, toUser: any, fromId: string, toId: string, amount: number }>}
 */
export const simplifyDebts = (balances) => {
  if (!Array.isArray(balances) || balances.length === 0) {
    return [];
  }

  // Work with integer cents to avoid floating-point drift
  const creditors = [];
  const debtors = [];

  balances.forEach((item) => {
    // Net balance in cents
    const cents = Math.round(Number(item.netBalance || 0) * 100);

    if (cents > 0) {
      creditors.push({
        id: item.userId,
        user: item.user,
        amount: cents,
      });
    } else if (cents < 0) {
      debtors.push({
        id: item.userId,
        user: item.user,
        amount: Math.abs(cents),
      });
    }
  });

  // Sort descending by amount to settle largest chunks first (greedy heuristic)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let creditorIdx = 0;
  let debtorIdx = 0;

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];

    // Transfer the minimum of what debtor owes and creditor is owed
    const transferCents = Math.min(debtor.amount, creditor.amount);

    if (transferCents > 0) {
      transactions.push({
        fromId: debtor.id,
        fromUser: debtor.user,
        toId: creditor.id,
        toUser: creditor.user,
        amount: transferCents / 100, // Convert cents back to decimal currency
      });

      debtor.amount -= transferCents;
      creditor.amount -= transferCents;
    }

    // Advance pointers if settled
    if (debtor.amount === 0) {
      debtorIdx++;
    }
    if (creditor.amount === 0) {
      creditorIdx++;
    }
  }

  return transactions;
};

