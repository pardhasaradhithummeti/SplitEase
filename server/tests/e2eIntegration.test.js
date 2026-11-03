import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5000/api';

test('End-to-End Workflow: Auth, Groups, Invitations, Expenses, Balances, and Settlements', async () => {
  const timestamp = Date.now();
  const aliceData = {
    name: 'Alice Cooper',
    email: `alice_${timestamp}@test.com`,
    password: 'password123',
    confirmPassword: 'password123',
  };
  const bobData = {
    name: 'Bob Marley',
    email: `bob_${timestamp}@test.com`,
    password: 'password123',
    confirmPassword: 'password123',
  };
  const charlieData = {
    name: 'Charlie Puth',
    email: `charlie_${timestamp}@test.com`,
    password: 'password123',
    confirmPassword: 'password123',
  };

  // 1. Register users
  const registerUser = async (data) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    assert.equal(res.status, 201, `Failed to register ${data.name}: ${json.message}`);
    assert.ok(json.token, 'Token should be returned');
    assert.equal(json.password, undefined, 'Password should never be returned');
    return json;
  };

  const alice = await registerUser(aliceData);
  const bob = await registerUser(bobData);
  const charlie = await registerUser(charlieData);

  // 2. Alice creates a group
  const createGroupRes = await fetch(`${BASE_URL}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({
      name: 'Goa Getaway',
      description: 'Trip with Alice, Bob, and Charlie',
    }),
  });
  const group = await createGroupRes.json();
  assert.equal(createGroupRes.status, 201);
  assert.equal(group.name, 'Goa Getaway');
  assert.equal(group.members.length, 1);
  assert.equal(group.members[0]._id, alice._id);

  // 3. Alice invites Bob and Charlie
  const inviteRes1 = await fetch(`${BASE_URL}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({
      groupId: group._id,
      email: bob.email,
    }),
  });
  const inv1 = await inviteRes1.json();
  assert.equal(inviteRes1.status, 201);
  assert.equal(inv1.status, 'pending');

  const inviteRes2 = await fetch(`${BASE_URL}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({
      groupId: group._id,
      email: charlie.email,
    }),
  });
  const inv2 = await inviteRes2.json();
  assert.equal(inviteRes2.status, 201);

  // Check duplicate invitation prevention
  const dupInviteRes = await fetch(`${BASE_URL}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({
      groupId: group._id,
      email: bob.email,
    }),
  });
  assert.equal(dupInviteRes.status, 400);

  // 4. Bob checks invitations and accepts
  const bobInvitesRes = await fetch(`${BASE_URL}/invitations`, {
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  const bobInvites = await bobInvitesRes.json();
  assert.equal(bobInvites.length, 1);
  assert.equal(bobInvites[0]._id, inv1._id);

  const bobAcceptRes = await fetch(`${BASE_URL}/invitations/${inv1._id}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert.equal(bobAcceptRes.status, 200);

  // Charlie accepts
  const charlieAcceptRes = await fetch(`${BASE_URL}/invitations/${inv2._id}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${charlie.token}` },
  });
  assert.equal(charlieAcceptRes.status, 200);

  // 5. Verify group now has 3 members
  const groupDetailsRes = await fetch(`${BASE_URL}/groups/${group._id}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  const groupDetails = await groupDetailsRes.json();
  assert.equal(groupDetails.group.members.length, 3);

  // 6. Alice adds an equal split expense: ₹1200 for Dinner (split 3 ways: ₹400 each)
  const expense1Res = await fetch(`${BASE_URL}/groups/${group._id}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({
      description: 'Seafood Beach Dinner',
      amount: 1200,
      paidBy: alice._id,
      splitType: 'equal',
      participants: [alice._id, bob._id, charlie._id],
    }),
  });
  assert.equal(expense1Res.status, 201);

  // 7. Verify balances:
  // Alice paid 1200, share 400 -> Net Balance +800
  // Bob paid 0, share 400 -> Net Balance -400
  // Charlie paid 0, share 400 -> Net Balance -400
  const afterExp1 = await (await fetch(`${BASE_URL}/groups/${group._id}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  })).json();

  const bAlice = afterExp1.balances.find((b) => b.userId === alice._id);
  const bBob = afterExp1.balances.find((b) => b.userId === bob._id);
  const bCharlie = afterExp1.balances.find((b) => b.userId === charlie._id);

  assert.equal(bAlice.netBalance, 800);
  assert.equal(bBob.netBalance, -400);
  assert.equal(bCharlie.netBalance, -400);

  // Check suggested settlements from greedy algorithm:
  // Bob owes Alice 400
  // Charlie owes Alice 400
  assert.equal(afterExp1.suggestedSettlements.length, 2);

  // 8. Bob settles with Alice: Bob records payment of 400 and marks as paid
  const settleRes = await fetch(`${BASE_URL}/groups/${group._id}/settlements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bob.token}`,
    },
    body: JSON.stringify({
      receiverId: alice._id,
      amount: 400,
      notes: 'Sent via GPay',
      markAsPaid: true,
    }),
  });
  const settleRecord = await settleRes.json();
  assert.equal(settleRes.status, 201);
  assert.equal(settleRecord.status, 'awaiting_confirmation');

  // Verify unauthorized confirmation: Bob cannot confirm his own payment
  const bobConfirmRes = await fetch(`${BASE_URL}/settlements/${settleRecord._id}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert.equal(bobConfirmRes.status, 403, 'Payer should not be able to confirm receipt');

  // Alice confirms receipt
  const aliceConfirmRes = await fetch(`${BASE_URL}/settlements/${settleRecord._id}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert.equal(aliceConfirmRes.status, 200);

  // 9. Recalculate balances:
  // Bob settled his 400 -> Bob's net balance is now 0!
  // Alice received 400 -> Alice's net balance is now +400
  // Charlie still owes 400 -> Charlie's net balance is -400
  const afterSettle = await (await fetch(`${BASE_URL}/groups/${group._id}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  })).json();

  const bAlice2 = afterSettle.balances.find((b) => b.userId === alice._id);
  const bBob2 = afterSettle.balances.find((b) => b.userId === bob._id);
  const bCharlie2 = afterSettle.balances.find((b) => b.userId === charlie._id);

  assert.equal(bBob2.netBalance, 0);
  assert.equal(bAlice2.netBalance, 400);
  assert.equal(bCharlie2.netBalance, -400);

  // Suggested settlements should now have only Charlie -> Alice 400
  assert.equal(afterSettle.suggestedSettlements.length, 1);
  assert.equal(afterSettle.suggestedSettlements[0].fromId, charlie._id);
  assert.equal(afterSettle.suggestedSettlements[0].toId, alice._id);
  assert.equal(afterSettle.suggestedSettlements[0].amount, 400);

  // 10. Dashboard API check
  const dashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  const dash = await dashRes.json();
  assert.equal(dashRes.status, 200);
  assert.equal(dash.totalOwedToYou, 400);
  assert.equal(dash.totalOwed, 0);
  assert.equal(dash.groupsCount, 1);
  assert.equal(dash.recentExpenses.length, 1);

  // 11. Profile Update & Password Change
  const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({ name: 'Alice C. Updated' }),
  });
  const updatedProfile = await updateProfileRes.json();
  assert.equal(updateProfileRes.status, 200);
  assert.equal(updatedProfile.name, 'Alice C. Updated');

  const changePwRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alice.token}`,
    },
    body: JSON.stringify({
      currentPassword: 'password123',
      newPassword: 'newsecurepassword456',
      confirmNewPassword: 'newsecurepassword456',
    }),
  });
  assert.equal(changePwRes.status, 200);

  // Verify login with new password
  const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: alice.email,
      password: 'newsecurepassword456',
    }),
  });
  assert.equal(newLoginRes.status, 200);
});

