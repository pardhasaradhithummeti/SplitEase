import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Users2,
  Receipt,
  PlusCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  Mail,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { formatCurrency, formatDate } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard');
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <PageLoader message="Loading your dashboard..." />;
  }

  const {
    totalOwed = 0,
    totalOwedToYou = 0,
    groupsCount = 0,
    pendingInvitationsCount = 0,
    recentExpenses = [],
    pendingSettlements = [],
  } = summary || {};

  return (
    <div className="space-y-6">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is your live financial snapshot across all your groups
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          icon={PlusCircle}
          className="shadow-md"
        >
          Create Group
        </Button>
      </div>

      {/* Invitations Notification Banner */}
      {pendingInvitationsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                You have {pendingInvitationsCount} pending group invitation{pendingInvitationsCount > 1 ? 's' : ''}!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Join your friends to start sharing expenses together.
              </p>
            </div>
          </div>
          <Link to="/invitations">
            <Button size="sm" variant="secondary" className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-none">
              View Invitations
            </Button>
          </Link>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* You Are Owed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              You are owed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(totalOwedToYou)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Money other members need to return to you
          </p>
        </div>

        {/* You Owe */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              You owe
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {formatCurrency(totalOwed)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total amount you need to settle with others
          </p>
        </div>

        {/* Total Groups */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Groups
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {groupsCount}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">Groups you are participating in</p>
            <Link to="/groups" className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Expenses & Pending Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Expenses (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-600" />
              Recent Expenses
            </h2>
            <Link
              to="/groups"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Browse Groups <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded yet"
              description="Create a group, invite friends, and start tracking your shared trip and dining expenses."
              actionLabel="Create Your First Group"
              onAction={() => setIsCreateModalOpen(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {recentExpenses.map((expense) => {
                const isPaidByMe = expense.paidBy?._id === user?._id;
                const mySplit = expense.splits?.find(
                  (s) => (s.user?._id || s.user) === user?._id
                );

                return (
                  <div
                    key={expense._id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0 text-slate-600 font-bold text-xs">
                        <Receipt className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {expense.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                            {expense.group?.name || 'Group'}
                          </span>
                          <span>•</span>
                          <span>
                            Paid by{' '}
                            <strong className="text-slate-600 font-semibold">
                              {isPaidByMe ? 'You' : expense.paidBy?.name}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>{formatDate(expense.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="text-[11px] font-medium mt-0.5">
                        {isPaidByMe ? (
                          <span className="text-emerald-600 font-semibold">
                            You paid full
                          </span>
                        ) : mySplit ? (
                          <span className="text-rose-600 font-semibold">
                            Your share: {formatCurrency(mySplit.amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not involved</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Pending Settlements & Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Settlement Action Needed
          </h2>

          {pendingSettlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">All settled up!</p>
              <p className="mt-1">No settlements currently waiting for confirmation.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {pendingSettlements.map((settlement) => {
                const isReceiver = settlement.receiver?._id === user?._id;
                const isPayer = settlement.payer?._id === user?._id;

                return (
                  <div key={settlement._id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">
                        {settlement.group?.name}
                      </span>
                      <Badge
                        variant={
                          settlement.status === 'awaiting_confirmation'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {settlement.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {isPayer ? 'You' : settlement.payer?.name} →{' '}
                          {isReceiver ? 'You' : settlement.receiver?.name}
                        </p>
                        {settlement.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            &quot;{settlement.notes}&quot;
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>

                    <div className="pt-2">
                      <Link to={`/groups/${settlement.group?._id}`}>
                        <Button size="sm" variant="outline" className="w-full text-xs">
                          {isReceiver && settlement.status === 'awaiting_confirmation'
                            ? 'Review & Confirm Receipt'
                            : 'View in Group'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={() => fetchDashboardData()}
      />
    </div>
  );
};

