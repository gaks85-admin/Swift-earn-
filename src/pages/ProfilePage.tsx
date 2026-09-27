import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, admin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onNavigate('login');
  };

  const isAuthorizedAdmin = (user?.email || '').toLowerCase() === 'tonyanderson19880@gmail.com' || Boolean(admin);

  if (!user) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-12">
        <div className="max-w-md mx-auto px-4 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center mx-auto shadow-xs">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Account Profile</h2>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              Log in or create an account to access and manage your profile.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              id="profile-guest-login-btn"
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              id="profile-guest-signup-btn"
              onClick={() => onNavigate('signup')}
              className="px-5 py-2.5 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Account Profile
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage your personal profile and account credentials.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#6C2BD9] text-[#B8F500] font-black text-2xl flex items-center justify-center shadow-md">
              {profile?.avatar_initials || 'SE'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-zinc-900">{profile?.full_name || 'Member'}</h2>
                <span className="bg-[#B8F500] text-[#0F172A] font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
            </div>
          </div>

          <button
            id="btn-profile-logout"
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Admin Access Card (Only visible to authorized admin) */}
        {isAuthorizedAdmin && (
          <div className="bg-gradient-to-r from-zinc-950 to-[#0F172A] rounded-3xl p-6 border border-zinc-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center shrink-0 shadow-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white">Administrator Portal</h3>
                  <span className="bg-[#B8F500] text-[#0F172A] text-[9px] font-black px-2 py-0.5 rounded uppercase">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Access platform telemetry, withdrawal approvals, user management, and security logs.
                </p>
              </div>
            </div>

            <button
              id="btn-[#admin-portal-access]"
              onClick={() => onNavigate('admin')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-[#B8F500]" />
              <span>Launch Admin Dashboard</span>
            </button>
          </div>
        )}

        {/* Account Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">
            Account Overview
          </h3>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Account ID</span>
              <span className="font-mono text-zinc-800 font-semibold">{user?.id?.slice(0, 10)}...</span>
            </div>

            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Member Since</span>
              <span className="font-medium text-zinc-800">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-zinc-500">Referral Code</span>
              <span className="font-mono font-bold text-[#6C2BD9]">{profile?.referral_code}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
