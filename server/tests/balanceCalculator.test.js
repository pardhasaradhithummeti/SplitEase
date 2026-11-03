import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGroupBalances } from '../utils/balanceCalculator.js';

test('calculateGroupBalances - Section 9 prompt example', () => {
  const members = [
    { _id: 'A', name: 'User A', email: 'a@example.com' },
    { _id: 'B', name: 'User B', email: 'b@example.com' },
    { _id: 'C', name: 'User C', email: 'c@example.com' },
    { _id: 'D', name: 'User D', email: 'd@example.com' },
  ];

  // Total expense: 10000, each share: 2500
  // User A paid 6000
  // User B paid 2000
  // User C paid 1200
  // User D paid 800
  const expenses = [
    {
      _id: 'exp1',
      paidBy: 'A',
      amount: 6000,
      splits: [
        { user: 'A', amount: 1500 },
        { user: 'B', amount: 1500 },
        { user: 'C', amount: 1500 },
        { user: 'D', amount: 1500 },
      ],
    },
    {
      _id: 'exp2',
      paidBy: 'B',
      amount: 2000,
      splits: [
        { user: 'A', amount: 500 },
        { user: 'B', amount: 500 },
        { user: 'C', amount: 500 },
        { user: 'D', amount: 500 },
      ],
    },
    {
      _id: 'exp3',
      paidBy: 'C',
      amount: 1200,
      splits: [
        { user: 'A', amount: 300 },
        { user: 'B', amount: 300 },
        { user: 'C', amount: 300 },
        { user: 'D', amount: 300 },
      ],
    },
    {
      _id: 'exp4',
      paidBy: 'D',
      amount: 800,
      splits: [
        { user: 'A', amount: 200 },
        { user: 'B', amount: 200 },
        { user: 'C', amount: 200 },
        { user: 'D', amount: 200 },
      ],
    },
  ];

  const balances = calculateGroupBalances(members, expenses);

  const map = {};
  balances.forEach((b) => {
    map[b.userId] = b;
  });

  // Prompt example:
  // A: Paid ₹6,000, Share ₹2,500, Balance: +₹3,500
  // B: Paid ₹2,000, Share ₹2,500, Balance: -₹500
  // C: Paid ₹1,200, Share ₹2,500, Balance: -₹1,300
  // D: Paid ₹800, Share ₹2,500, Balance: -₹1,700
  assert.equal(map['A'].paid, 6000);
  assert.equal(map['A'].share, 2500);
  assert.equal(map['A'].netBalance, 3500);

  assert.equal(map['B'].paid, 2000);
  assert.equal(map['B'].share, 2500);
  assert.equal(map['B'].netBalance, -500);

  assert.equal(map['C'].paid, 1200);
  assert.equal(map['C'].share, 2500);
  assert.equal(map['C'].netBalance, -1300);

  assert.equal(map['D'].paid, 800);
  assert.equal(map['D'].share, 2500);
  assert.equal(map['D'].netBalance, -1700);

  // Group sum must equal 0
  const totalBalance = balances.reduce((sum, b) => sum + b.netBalance, 0);
  assert.equal(Math.round(totalBalance), 0);
});

test('calculateGroupBalances - includes confirmed settlements', () => {
  const members = [{ _id: 'A' }, { _id: 'B' }];
  const expenses = [
    {
      paidBy: 'A',
      amount: 100,
      splits: [
        { user: 'A', amount: 50 },
        { user: 'B', amount: 50 },
      ],
    },
  ];

  // Initially B owes A 50. (A has +50, B has -50)
  // B settles 50 to A and it is completed
  const settlements = [
    {
      payer: 'B',
      receiver: 'A',
      amount: 50,
      status: 'completed',
    },
  ];

  const balances = calculateGroupBalances(members, expenses, settlements);
  const a = balances.find((b) => b.userId === 'A');
  const b = balances.find((b) => b.userId === 'B');

  assert.equal(a.netBalance, 0);
  assert.equal(b.netBalance, 0);
});

