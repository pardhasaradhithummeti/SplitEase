import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users2,
  Receipt,
  Scale,
  HandCoins,
  PlusCircle,
  UserPlus,
  ArrowRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { InviteMemberModal } from '../components/groups/InviteMemberModal';
import { RecordSettlementModal } from '../components/settlements/RecordSettlementModal';
import { formatCurrency, formatDate } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const GroupDetailsPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'balances' | 'settlements' | 'members'
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [prefilledSettlement, setPrefilledSettlement] = useState(null);

  const fetchGroupDetails = useCallback(async () => {
    try {
      const res = await api.get(`/groups/${groupId}`);
      setGroupData(res.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load group details', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, addToast]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  if (loading) {
    return <PageLoader message="Loading group finances..." />;
  }

  if (!groupData || !groupData.group) {
    return (
      <EmptyState
        title="Group Not Found"
        description="This group may have been removed or you are not a member."
        actionLabel="Back to My Groups"
        onAction={() => window.history.back()}
      />
    );
  }

  const { group, expenses = [], settlements = [], balances = [], suggestedSettlements = [] } = groupData;

  // Total group spending
  const totalGroupSpending = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // My net balance in this group
  const myBalanceObj = balances.find((b) => b.userId === user?._id);
  const myNetBalance = myBalanceObj ? myBalanceObj.netBalance : 0;

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await api.delete(`/expenses/${expenseId}`);
      addToast('Expense deleted', 'success');
      fetchGroupDetails();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete expense', 'error');
    }
  };

  // Handle Mark Settlement Paid (by Payer)
  const handleMarkSettlementPaid = async (settlementId) => {
    try {
      await api.put(`/settlements/${settlementId}/mark-paid`);
      addToast('Settlement marked as paid. Waiting for receiver confirmation.', 'success');
      fetchGroupDetails();
    } catch (err) {
      addToast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  // Handle Confirm Settlement Receipt (by Receiver)
  const handleConfirmSettlement = async (settlementId) => {
    try {
      await api.put(`/settlements/${settlementId}/confirm`);
      addToast('Payment confirmed! Balances recalculated.', 'success');
      fetchGroupDetails();
    } catch (err) {
      addToast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  // Handle Cancel Settlement
  const handleCancelSettlement = async (settlementId) => {
    if (!window.confirm('Cancel this settlement record?')) return;

    try {
      await api.delete(`/settlements/${settlementId}`);
      addToast('Settlement cancelled', 'info');
      fetchGroupDetails();
    } catch (err) {
      addToast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  // Sum check across all balances
  const sumOfAllBalances = balances.reduce((sum, b) => sum + b.netBalance, 0);

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link to="/groups" className="hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Groups
        </Link>
        <span>/</span>
        <span className="text-slate-700">{group.name}</span>
      </div>

      {/* Group Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-lg shadow-sm">
                <Users2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {group.name}
                </h1>
                <p className="text-xs text-slate-500">
                  Created by {group.creator?.name || 'Member'} • {group.members?.length} members
                </p>
              </div>
            </div>
            {group.description && (
              <p className="text-xs text-slate-600 max-w-xl">{group.description}</p>
            )}
          </div>

          {/* Group Financial Summary Stats */}
          <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Expenses
              </span>
              <span className="text-lg font-black text-slate-900">
                {formatCurrency(totalGroupSpending)}
              </span>
            </div>

            <div className="border-l border-slate-100 pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Your Balance
              </span>
              <span
                className={`text-lg font-black ${
                  myNetBalance > 0
                    ? 'text-emerald-600'
                    : myNetBalance < 0
                    ? 'text-rose-600'
                    : 'text-slate-700'
                }`}
              >
                {myNetBalance > 0 ? `+${formatCurrency(myNetBalance)}` : formatCurrency(myNetBalance)}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto md:ml-2">
              <Button
                variant="outline"
                size="sm"
                icon={UserPlus}
                onClick={() => setIsInviteModalOpen(true)}
              >
                Invite
              </Button>
              <Button
                size="sm"
                icon={PlusCircle}
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
              >
                Add Expense
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-100 mt-6 pt-3 overflow-x-auto">
          {[
            { id: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
            { id: 'balances', label: 'Balances', icon: Scale, count: balances.length },
            {
              id: 'settlements',
              label: 'Settlements',
              icon: HandCoins,
              count: suggestedSettlements.length > 0 ? suggestedSettlements.length : null,
            },
            { id: 'members', label: 'Members', icon: Users2, count: group.members?.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Group Expense History</h2>
            <Button
              size="sm"
              icon={PlusCircle}
              onClick={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
            >
              Add Expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses in this group yet"
              description="Keep track of every dinner, cab ride, or stay. Expenses will be split automatically."
              actionLabel="Add First Expense"
              actionIcon={PlusCircle}
              onAction={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {expenses.map((expense) => {
                const isPaidByMe = expense.paidBy?._id === user?._id;
                const canManage =
                  isPaidByMe || expense.createdBy?._id === user?._id;

                const mySplit = expense.splits?.find(
                  (s) => (s.user?._id || s.user) === user?._id
                );

                return (
                  <div
                    key={expense._id}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-brand-700 shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">
                          {expense.description}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                          <span>
                            Paid by{' '}
                            <strong className="text-slate-700 font-semibold">
                              {isPaidByMe ? 'You' : expense.paidBy?.name}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>{formatDate(expense.date)}</span>
                          <span>•</span>
                          <span className="capitalize font-medium text-slate-500">
                            {expense.splitType} split ({expense.splits?.length} participants)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900 block">
                          {formatCurrency(expense.amount)}
                        </span>
                        <span className="text-[11px] font-semibold">
                          {isPaidByMe ? (
                            <span className="text-emerald-600">You paid full</span>
                          ) : mySplit ? (
                            <span className="text-rose-600">
                              Your share: {formatCurrency(mySplit.amount)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not sharing</span>
                          )}
                        </span>
                      </div>

                      {/* Edit / Delete actions for owner */}
                      {canManage && (
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-4">
                          <button
                            onClick={() => {
                              setExpenseToEdit(expense);
                              setIsExpenseModalOpen(true);
                            }}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense._id)}
                            title="Delete Expense"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Member Net Balances</h2>
              <p className="text-xs text-slate-500">
                Calculated dynamically from all expenses and confirmed settlements
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Net Group Sum: {formatCurrency(Math.abs(sumOfAllBalances))}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4 text-right">Total Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Expense Share (₹)</th>
                    <th className="py-3 px-4 text-right">Confirmed Settlements (₹)</th>
                    <th className="py-3 px-4 text-right">Net Balance (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {balances.map((item) => {
                    const isMe = item.userId === user?._id;
                    const isCreditor = item.netBalance > 0.005;
                    const isDebtor = item.netBalance < -0.005;

                    return (
                      <tr
                        key={item.userId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isMe ? 'bg-brand-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.user?.name || item.userId}{' '}
                          {isMe && (
                            <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                              You
                            </span>
                          )}
                          <span className="block text-[11px] text-slate-400 font-normal">
                            {item.user?.email}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-700 font-semibold">
                          {formatCurrency(item.paid)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-700 font-semibold">
                          {formatCurrency(item.share)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                          {item.settlementsPaid > 0 && (
                            <span className="text-emerald-600 font-bold block">
                              +{formatCurrency(item.settlementsPaid)} paid
                            </span>
                          )}
                          {item.settlementsReceived > 0 && (
                            <span className="text-rose-600 font-bold block">
                              -{formatCurrency(item.settlementsReceived)} received
                            </span>
                          )}
                          {!item.settlementsPaid && !item.settlementsReceived && '—'}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-extrabold text-sm ${
                            isCreditor
                              ? 'text-emerald-600'
                              : isDebtor
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {isCreditor ? `+${formatCurrency(item.netBalance)}` : formatCurrency(item.netBalance)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isCreditor && <Badge variant="success">Gets {formatCurrency(item.netBalance)}</Badge>}
                          {isDebtor && (
                            <Badge variant="danger">
                              Owes {formatCurrency(Math.abs(item.netBalance))}
                            </Badge>
                          )}
                          {!isCreditor && !isDebtor && (
                            <Badge variant="default">Settled Up</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENTS */}
      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* Section A: Simplified Settlement Algorithm Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-brand-600" />
                  Suggested Settlements (Greedy Algorithm)
                </h2>
                <p className="text-xs text-slate-500">
                  Minimal direct transactions to settle all group debts without round-robin payments
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPrefilledSettlement(null);
                  setIsSettlementModalOpen(true);
                }}
              >
                Record Custom Payment
              </Button>
            </div>

            {suggestedSettlements.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Everyone is fully settled!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  There are no pending debts in this group. All expenses and confirmed settlements balance out.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedSettlements.map((tx, idx) => {
                  const isPayerMe = tx.fromId === user?._id;
                  const isReceiverMe = tx.toId === user?._id;

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs">
                            {tx.fromUser?.name?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Debtor
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {isPayerMe ? 'You' : tx.fromUser?.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center px-2">
                          <span className="text-xs font-black text-brand-600">
                            {formatCurrency(tx.amount)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Creditor
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {isReceiverMe ? 'You' : tx.toUser?.name}
                            </span>
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            {tx.toUser?.name?.charAt(0) || 'C'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {isPayerMe
                            ? 'You need to pay this amount'
                            : isReceiverMe
                            ? 'You should receive this payment'
                            : 'Suggested transfer between members'}
                        </span>
                        <Button
                          size="sm"
                          variant={isPayerMe ? 'primary' : 'outline'}
                          onClick={() => {
                            setPrefilledSettlement(tx);
                            setIsSettlementModalOpen(true);
                          }}
                        >
                          Settle Up
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Recorded Settlements History & Confirmations */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Recorded Settlements & Approvals
            </h3>
            <p className="text-xs text-slate-500">
              Settlements require the receiver to confirm receipt before balances adjust.
            </p>

            {settlements.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No settlement transactions recorded yet.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {settlements.map((item) => {
                  const isPayerMe = item.payer?._id === user?._id;
                  const isReceiverMe = item.receiver?._id === user?._id;
                  const isCreatorMe = item.createdBy?._id === user?._id;

                  return (
                    <div
                      key={item._id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {isPayerMe ? 'You' : item.payer?.name} paid{' '}
                            {isReceiverMe ? 'You' : item.receiver?.name}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                          <Badge
                            variant={
                              item.status === 'completed'
                                ? 'success'
                                : item.status === 'awaiting_confirmation'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {item.status === 'awaiting_confirmation'
                              ? 'Awaiting Receipt Confirmation'
                              : item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-500 italic">
                            &quot;{item.notes}&quot;
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Recorded {formatDate(item.createdAt)}
                          {item.confirmedAt && ` • Confirmed ${formatDate(item.confirmedAt)}`}
                        </p>
                      </div>

                      {/* Action buttons based on status & permissions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Payer can mark as paid if still pending */}
                        {item.status === 'pending' && isPayerMe && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleMarkSettlementPaid(item._id)}
                          >
                            Mark as Paid
                          </Button>
                        )}

                        {/* Receiver can confirm receipt if awaiting_confirmation */}
                        {item.status === 'awaiting_confirmation' && isReceiverMe && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={CheckCircle2}
                            onClick={() => handleConfirmSettlement(item._id)}
                          >
                            Confirm Received
                          </Button>
                        )}

                        {/* Receiver waiting message */}
                        {item.status === 'awaiting_confirmation' && !isReceiverMe && (
                          <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Waiting for {item.receiver?.name}
                          </span>
                        )}

                        {/* Cancel option for creator/payer if not completed */}
                        {item.status !== 'completed' && (isPayerMe || isReceiverMe || isCreatorMe) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleCancelSettlement(item._id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Group Members ({group.members?.length})
            </h2>
            <Button
              size="sm"
              icon={UserPlus}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {group.members?.map((member) => {
              const isCreator = group.creator?._id === member._id;
              const isMe = member._id === user?._id;

              return (
                <div
                  key={member._id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {member.name} {isMe && '(You)'}
                      </p>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCreator && <Badge variant="brand">Group Creator</Badge>}
                    {isMe && <Badge variant="default">You</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        group={group}
        expenseToEdit={expenseToEdit}
        onExpenseSaved={fetchGroupDetails}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        group={group}
        onInviteSent={fetchGroupDetails}
      />

      <RecordSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        group={group}
        prefilled={prefilledSettlement}
        onSettlementRecorded={fetchGroupDetails}
      />
    </div>
  );
};

