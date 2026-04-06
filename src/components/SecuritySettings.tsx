import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SecuritySettings = () => {
  const { user, updateEmailAddress, updateUserPassword } = useAuth();
  
  const [email, setEmail] = useState(user?.email || '');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !currentPasswordForEmail) {
      toast.error('Please fill in all fields');
      return;
    }

    if (email === user?.email) {
      toast.error('This is already your current email');
      return;
    }

    try {
      setIsUpdatingEmail(true);
      await updateEmailAddress(email, currentPasswordForEmail);
      toast.success('Email updated successfully!');
      setCurrentPasswordForEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await updateUserPassword(currentPassword, newPassword);
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // If user signed in with Google, they might not have a password set up
  const isGoogleProvider = user?.providerData.some(p => p.providerId === 'google.com');

  if (isGoogleProvider) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Security Settings</h2>
        </div>
        
        <div className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-1">Google Account Linked</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Your account is linked to Google. You can manage your security settings directly through your Google Account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Update Email Section */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Update Email</h2>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">New Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100"
              placeholder="Enter new email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPasswordForEmail}
              onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100"
              placeholder="Confirm your password"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingEmail}
              className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdatingEmail ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Update Email
            </button>
          </div>
        </form>
      </div>

      {/* Update Password Section */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Update Password</h2>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100"
              placeholder="Confirm new password"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdatingPassword ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
