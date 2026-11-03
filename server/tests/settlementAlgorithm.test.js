import test from 'node:test';
import assert from 'node:assert/strict';
import { simplifyDebts } from '../utils/settlementAlgorithm.js';

test('simplifyDebts - Section 10 prompt example', () => {
  // Balances:
  // A: +2000
  // B: +1000
  // C: -1500
  // D: -1500
  const balances = [
    { userId: 'A', user: { name: 'A' }, netBalance: 2000 },
    { userId: 'B', user: { name: 'B' }, netBalance: 1000 },
    { userId: 'C', user: { name: 'C' }, netBalance: -1500 },
    { userId: 'D', user: { name: 'D' }, netBalance: -1500 },
  ];

  const transactions = simplifyDebts(balances);

  // Total transferred must equal total debt (3000)
  const totalTransferred = transactions.reduce((sum, t) => sum + t.amount, 0);
  assert.equal(totalTransferred, 3000);

  // In greedy order with C and D (-1500 each) and A (+2000), B (+1000):
  // Debtor 1 (C or D, 1500) pays Creditor 1 (A, 2000): transfer 1500 -> A still owed 500
  // Debtor 2 (D or C, 1500) pays Creditor 1 (A, remaining 500): transfer 500 -> Debtor 2 still owes 1000
  // Debtor 2 pays Creditor 2 (B, 1000): transfer 1000
  // Total transactions: 3 transactions
  assert.equal(transactions.length, 3);

  // Verify that all transactions have positive amounts
  transactions.forEach((tx) => {
    assert.ok(tx.amount > 0);
    assert.ok(tx.fromId === 'C' || tx.fromId === 'D');
    assert.ok(tx.toId === 'A' || tx.toId === 'B');
  });
});

test('simplifyDebts - handles decimal amounts safely', () => {
  const balances = [
    { userId: 'User1', user: 'User1', netBalance: 33.33 },
    { userId: 'User2', user: 'User2', netBalance: -16.67 },
    { userId: 'User3', user: 'User3', netBalance: -16.66 },
  ];

  const transactions = simplifyDebts(balances);
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  assert.equal(Math.round(total * 100) / 100, 33.33);
});

test('simplifyDebts - handles empty and all-zero balances', () => {
  assert.deepEqual(simplifyDebts([]), []);
  assert.deepEqual(
    simplifyDebts([
      { userId: '1', netBalance: 0 },
      { userId: '2', netBalance: 0 },
    ]),
    []
  );
});

