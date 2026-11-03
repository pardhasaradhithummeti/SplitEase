import React, { useState, useEffect } from 'react';
import { Mail, Search, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export const InviteMemberModal = ({ isOpen, onClose, group, onInviteSent }) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search users debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/auth/users/search?q=${encodeURIComponent(searchQuery)}`);
        // Filter out users already in group
        const existingMemberIds = (group?.members || []).map((m) => (m._id || m).toString());
        const filtered = res.data.filter((u) => !existingMemberIds.includes(u._id.toString()));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, group]);

  const handleSendInvite = async (targetEmail) => {
    const inviteEmail = targetEmail || email;
    if (!inviteEmail || !inviteEmail.trim()) {
      addToast('Please enter an email address', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/invitations', {
        groupId: group._id,
        email: inviteEmail.trim(),
      });
      addToast(`Invitation sent to ${inviteEmail}`, 'success');
      setEmail('');
      setSearchQuery('');
      setSearchResults([]);
      onClose();
      if (onInviteSent) onInviteSent();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send invitation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Member to ${group?.name || 'Group'}`}
      description="Only existing registered SplitEase users can be invited"
    >
      <div className="space-y-5">
        {/* Quick Search */}
        <div>
          <Input
            label="Search Registered Users"
            placeholder="Type name or email to search..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searching && (
            <p className="text-xs text-slate-400 mt-2">Searching registered users...</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{user.name}</p>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={UserPlus}
                    disabled={loading}
                    onClick={() => handleSendInvite(user.email)}
                  >
                    Invite
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase">
            Or invite directly by email
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Direct Email Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendInvite();
          }}
          className="space-y-4"
        >
          <Input
            label="User Email Address"
            type="email"
            placeholder="friend@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="The user will see this invitation in their Invitations dashboard"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} icon={UserPlus}>
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

