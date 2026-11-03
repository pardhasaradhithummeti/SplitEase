import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Calendar, CheckSquare, Square, AlertCircle, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/currency';
import api from '../../services/api';

export const ExpenseModal = ({
  isOpen,
  onClose,
  group,
  expenseToEdit = null,
  onExpenseSaved,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('equal');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const members = group?.members || [];

  // Reset or pre-fill form
  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description || '');
      setAmount(expenseToEdit.amount ? expenseToEdit.amount.toString() : '');
      setPaidBy(expenseToEdit.paidBy?._id || expenseToEdit.paidBy || user._id);
      setDate(
        expenseToEdit.date
          ? new Date(expenseToEdit.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setSplitType(expenseToEdit.splitType || 'equal');

      const participantIds = expenseToEdit.splits?.map((s) => s.user?._id || s.user) || [];
      setSelectedParticipants(participantIds);

      const customObj = {};
      expenseToEdit.splits?.forEach((s) => {
        const uId = s.user?._id || s.user;
        customObj[uId] = s.amount;
      });
      setCustomSplits(customObj);
    } else {
      setDescription('');
      setAmount('');
      setPaidBy(user?._id || members[0]?._id || '');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitType('equal');
      const allMemberIds = members.map((m) => m._id);
      setSelectedParticipants(allMemberIds);
      setCustomSplits({});
    }
    setErrors({});
  }, [isOpen, expenseToEdit, group, user]);

  const toggleParticipant = (memberId) => {
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length === 1) {
        addToast('At least one member must share the expense', 'error');
        return;
      }
      setSelectedParticipants((prev) => prev.filter((id) => id !== memberId));
    } else {
      setSelectedParticipants((prev) => [...prev, memberId]);
    }
  };

  const handleCustomSplitChange = (memberId, value) => {
    setCustomSplits((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // Calculations for split preview
  const numAmount = parseFloat(amount) || 0;
  const participantCount = selectedParticipants.length;
  const equalSharePerPerson = participantCount > 0 ? (numAmount / participantCount).toFixed(2) : 0;

  // Custom split sum
  const customSum = selectedParticipants.reduce((acc, memberId) => {
    const val = parseFloat(customSplits[memberId]) || 0;
    return acc + val;
  }, 0);

  const customDifference = Math.round((numAmount - customSum) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!numAmount || numAmount <= 0) {
      newErrors.amount = 'Valid positive amount is required';
    }
    if (!paidBy) {
      newErrors.paidBy = 'Please select who paid';
    }
    if (selectedParticipants.length === 0) {
      newErrors.participants = 'Select at least one participant';
    }

    if (splitType === 'custom') {
      if (Math.abs(customDifference) > 0.01) {
        newErrors.custom = `Custom split shares must sum to ${formatCurrency(numAmount)}. Current discrepancy: ${formatCurrency(Math.abs(customDifference))}`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        amount: numAmount,
        paidBy,
        date,
        splitType,
        participants: selectedParticipants,
        customSplits: splitType === 'custom' ? customSplits : undefined,
      };

      if (expenseToEdit) {
        await api.put(`/expenses/${expenseToEdit._id}`, payload);
        addToast('Expense updated successfully!', 'success');
      } else {
        await api.post(`/groups/${group._id}/expenses`, payload);
        addToast('Expense added successfully!', 'success');
      }

      onClose();
      if (onExpenseSaved) onExpenseSaved();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
      description={`Record an expense for ${group?.name}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Expense Description"
          placeholder="e.g. Dinner at Marina, Groceries, Hotel booking"
          icon={FileText}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Total Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            icon={DollarSign}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
            required
          />

          <Input
            label="Date"
            type="date"
            icon={Calendar}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Paid By Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Paid By <span className="text-rose-500">*</span>
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name} {member._id === user?._id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Split Type Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Split Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSplitType('equal')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                splitType === 'equal'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Split Equally
            </button>
            <button
              type="button"
              onClick={() => setSplitType('custom')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                splitType === 'custom'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Custom Unequal Split
            </button>
          </div>
        </div>

        {/* Split Details Section */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Participants ({selectedParticipants.length} of {members.length})
            </span>
            {splitType === 'equal' && numAmount > 0 && participantCount > 0 && (
              <span className="text-xs font-semibold text-brand-600 bg-brand-100/60 px-2 py-0.5 rounded-md">
                ₹{equalSharePerPerson} / person
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {members.map((member) => {
              const isSelected = selectedParticipants.includes(member._id);
              return (
                <div
                  key={member._id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-100/60 border-transparent opacity-60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleParticipant(member._id)}
                    className="flex items-center gap-2.5 text-left flex-1"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {member.name} {member._id === user?._id ? '(You)' : ''}
                      </p>
                      <p className="text-[10px] text-slate-400">{member.email}</p>
                    </div>
                  </button>

                  {/* Split Input depending on type */}
                  {isSelected && splitType === 'custom' && (
                    <div className="flex items-center gap-1 w-28">
                      <span className="text-xs text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={customSplits[member._id] ?? ''}
                        onChange={(e) =>
                          handleCustomSplitChange(member._id, e.target.value)
                        }
                        className="w-full text-xs font-semibold p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {isSelected && splitType === 'equal' && numAmount > 0 && (
                    <span className="text-xs font-semibold text-slate-600">
                      ₹{equalSharePerPerson}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Split Discrepancy Indicator */}
          {splitType === 'custom' && (
            <div className="pt-2 border-t border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500">
                Sum: <strong className="text-slate-800">{formatCurrency(customSum)}</strong> of{' '}
                {formatCurrency(numAmount)}
              </span>
              {Math.abs(customDifference) < 0.01 ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <Check className="w-3.5 h-3.5" /> Exact Match
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {customDifference > 0
                    ? `Remaining: ₹${customDifference.toFixed(2)}`
                    : `Over by: ₹${Math.abs(customDifference).toFixed(2)}`}
                </span>
              )}
            </div>
          )}
        </div>

        {errors.custom && (
          <p className="text-xs text-rose-500 font-medium">{errors.custom}</p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {expenseToEdit ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

