import React, { useState } from 'react';
import { User, Mail, Lock, Shield, CheckCircle } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/currency';
import api from '../services/api';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  // Profile info state
  const [name, setName] = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Change password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      addToast('Name must be at least 2 characters', 'error');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await api.put('/auth/profile', { name: name.trim() });
      updateUser(res.data);
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    if (passwordErrors[e.target.name]) {
      setPasswordErrors({ ...passwordErrors, [e.target.name]: '' });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Enter current password';
    }
    if (!passwordData.newPassword) {
      errors.newPassword = 'Enter new password';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', passwordData);
      addToast('Password changed successfully!', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Your Account & Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details, credentials, and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card info */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-xs">
          <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 font-extrabold text-2xl flex items-center justify-center mb-4 shadow-inner">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          <div className="w-full border-t border-slate-100 mt-6 pt-4 text-left space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Member Since
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {formatDate(user?.createdAt)}
            </span>
          </div>
        </div>

        {/* Edit details form */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Personal Info */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Personal Details
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update how your name appears to friends in your expense groups
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Full Name"
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{user?.email}</span>
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                    Primary
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Your registered email cannot be changed as it is your unique identifier for invitations.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={profileLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2: Change Password */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              Security & Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ensure your account is protected with a strong password
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                error={passwordErrors.currentPassword}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  placeholder="At least 6 characters"
                  icon={Lock}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  error={passwordErrors.newPassword}
                  required
                />

                <Input
                  label="Confirm New Password"
                  name="confirmNewPassword"
                  type="password"
                  placeholder="Repeat new password"
                  icon={Lock}
                  value={passwordData.confirmNewPassword}
                  onChange={handlePasswordChange}
                  error={passwordErrors.confirmNewPassword}
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={passwordLoading}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

