import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users2, PlusCircle, ArrowRight, UserCheck, Receipt } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';

export const GroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Error fetching groups', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  if (loading) {
    return <PageLoader message="Loading your groups..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Groups
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Groups you participate in for trips, events, and shared living expenses
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

      {groups.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No groups found"
          description="You haven't joined or created any groups yet. Create one or ask a friend to invite you."
          actionLabel="Create a New Group"
          actionIcon={PlusCircle}
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const balance = group.myBalance || 0;
            const isOwed = balance > 0;
            const owes = balance < 0;

            return (
              <Link
                key={group._id}
                to={`/groups/${group._id}`}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-brand-500/50 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                      <Users2 className="w-5 h-5" />
                    </div>

                    {/* Balance Pill */}
                    {isOwed && (
                      <Badge variant="success">
                        You are owed {formatCurrency(balance)}
                      </Badge>
                    )}
                    {owes && (
                      <Badge variant="danger">
                        You owe {formatCurrency(Math.abs(balance))}
                      </Badge>
                    )}
                    {!isOwed && !owes && (
                      <Badge variant="default">Settled up</Badge>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{group.members?.length || 1} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{group.totalExpensesCount || 0} expenses</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={() => fetchGroups()}
      />
    </div>
  );
};

