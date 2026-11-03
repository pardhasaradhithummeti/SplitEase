import React, { useState } from 'react';
import { Users2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Group name is required' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/groups', formData);
      addToast(`Group "${res.data.name}" created successfully!`, 'success');
      setFormData({ name: '', description: '' });
      onClose();
      if (onGroupCreated) onGroupCreated(res.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create group', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      description="Start a shared space for trip expenses, house bills, or outings"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          name="name"
          placeholder="e.g. Goa Trip 2026, Apartment 4B"
          icon={Users2}
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Description (Optional)
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="What is this group for?"
            value={formData.description}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 hover:border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};

