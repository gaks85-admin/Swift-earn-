import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, CheckCircle2, KeyRound, Mail, Lock, ArrowLeft } from 'lucide-react';

interface ResetPasswordPageProps {
  mode?: 'request' | 'update';
  onNavigate: (tab: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  mode = 'request',
  onNavigate,
}) => {
  const { resetPassword, updatePassword } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Request Reset Link Form Handler
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSuccessMessage(
        `Password reset link sent! Check your inbox at ${email} and click the link to set your new password.`
      );
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Update Password Form Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(newPassword);
      setSuccessMessage('Your password has been successfully updated! You can now log in.');
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <button
          onClick={() => onNavigate('login')}
          className="text-xs font-bold text-zinc-500 hover:text-[#6C2BD9] mb-4 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Log In</span>
        </button>

        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>

        <span className="text-3xl font-extrabold text-[#6C2BD9] tracking-tight block">
          Swift Earn
        </span>

        <h2 className="mt-2 text-2xl font-extrabold text-zinc-900 tracking-tight">
          {mode === 'update' ? 'Set New Password' : 'Reset Your Password'}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {mode === 'update'
            ? 'Enter your new password below to regain access to your account.'
            : 'Enter the email associated with your account and we’ll send you a password reset link.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-sm border border-zinc-200">
          {/* Error Message */}
          {error && (
            <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-900">
              <AlertCircle className="w-4 h-4 text-[#6C2BD9] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{successMessage}</p>
                {mode === 'request' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="mt-2 text-xs font-bold text-[#6C2BD9] underline block"
                  >
                    Return to Log In →
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'update' ? (
            /* Set New Password Form */
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-update-password-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <span>Set New Password</span>
                      <ArrowRight className="w-4 h-4 text-[#B8F500]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Request Reset Email Form */
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                  />
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-request-reset-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Sending Reset Link...</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4 text-[#B8F500]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Links back to Sign In or Sign Up */}
          <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-bold text-[#6C2BD9] hover:underline cursor-pointer"
            >
              Remember password? Log In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="font-bold text-zinc-600 hover:text-[#6C2BD9] hover:underline cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
