import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Mail, Check, X, Users2, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate } from '../utils/currency';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const InvitationsPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const outletContext = useOutletContext();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/invitations');
      setInvitations(res.data);
      if (outletContext?.refreshInvites) {
        outletContext.refreshInvites();
      }
    } catch (err) {
      console.error('Error fetching invitations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitationId, groupName, groupId) => {
    setProcessingId(invitationId);
    try {
      await api.put(`/invitations/${invitationId}/accept`);
      addToast(`Joined "${groupName}" successfully!`, 'success');
      fetchInvitations();
      navigate(`/groups/${groupId}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept invitation', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitationId, groupName) => {
    if (!window.confirm(`Decline invitation to "${groupName}"?`)) return;

    setProcessingId(invitationId);
    try {
      await api.put(`/invitations/${invitationId}/reject`);
      addToast(`Declined invitation to "${groupName}"`, 'info');
      fetchInvitations();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject invitation', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <PageLoader message="Loading pending invitations..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Group Invitations
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and respond to invitations sent to you by friends and colleagues
        </p>
      </div>

      {invitations.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No pending invitations"
          description="When someone invites your email address to a group, it will show up here for you to accept or decline."
          actionLabel="View My Groups"
          onAction={() => navigate('/groups')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invitations.map((invitation) => {
            const isBusy = processingId === invitation._id;

            return (
              <div
                key={invitation._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {invitation.group?.name || 'Group'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Invited by{' '}
                        <strong className="text-slate-700">
                          {invitation.inviter?.name}
                        </strong>{' '}
                        ({invitation.inviter?.email})
                      </p>
                    </div>
                  </div>

                  {invitation.group?.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      &quot;{invitation.group.description}&quot;
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Sent on {formatDate(invitation.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    icon={X}
                    onClick={() =>
                      handleReject(invitation._id, invitation.group?.name)
                    }
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isBusy}
                    isLoading={isBusy}
                    icon={Check}
                    onClick={() =>
                      handleAccept(
                        invitation._id,
                        invitation.group?.name,
                        invitation.group?._id
                      )
                    }
                  >
                    Accept & Join
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

