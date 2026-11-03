import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/currency';
import api from '../../services/api';

export const RecordSettlementModal = ({
  isOpen,
  onClose,
  group,
  prefilled = null,
  onSettlementRecorded,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [loading, setLoading] = useState(false);

  const members = group?.members || [];
  const otherMembers = members.filter((m) => m._id !== user?._id);

  useEffect(() => {
    if (prefilled) {
      setReceiverId(prefilled.toId || otherMembers[0]?._id || '');
      setAmount(prefilled.amount ? prefilled.amount.toString() : '');
      setNotes(prefilled.notes || '');
      setMarkAsPaid(true);
    } else {
      setReceiverId(otherMembers[0]?._id || '');
      setAmount('');
      setNotes('');
      setMarkAsPaid(true);
    }
  }, [isOpen, prefilled, group, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    if (!receiverId) {
      addToast('Please select who receives the payment', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/groups/${group._id}/settlements`, {
        receiverId,
        amount: numAmount,
        notes,
        markAsPaid,
      });

      addToast(
        markAsPaid
          ? 'Settlement recorded and marked as paid! Waiting for receiver confirmation.'
          : 'Settlement proposal created.',
        'success'
      );

      onClose();
      if (onSettlementRecorded) onSettlementRecorded();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Settlement"
      description="Record an off-app cash/UPI payment between group members"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payer and Receiver display */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Payer</span>
            <span className="text-sm font-bold text-slate-800">You ({user?.name})</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 mx-2" />
          <div className="flex-1 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Receiver</span>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {otherMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Settlement Amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          icon={DollarSign}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Input
          label="Payment Note / Reference (Optional)"
          placeholder="e.g. UPI Ref: 123456, GPay, Cash handed over"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Mark as paid toggle */}
        <label className="flex items-start gap-3 p-3 bg-brand-50/60 border border-brand-200/80 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={markAsPaid}
            onChange={(e) => setMarkAsPaid(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
          />
          <div className="text-xs">
            <p className="font-bold text-brand-900">Mark as Paid right now</p>
            <p className="text-brand-700/80 mt-0.5">
              Sets status to &quot;Awaiting Confirmation&quot;. The receiver will need to confirm receipt before group balances are adjusted.
            </p>
          </div>
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} icon={CheckCircle2}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};

