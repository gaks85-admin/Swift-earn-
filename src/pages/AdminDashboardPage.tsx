import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Wallet,
  Users,
  AlertTriangle,
  Gift,
  Plus,
  Play,
  RotateCcw,
  Sliders,
  XCircle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Check,
  Copy,
  Sparkles,
  Smartphone,
  Building2,
} from 'lucide-react';
import { api } from '../api';
import { Withdrawal, RewardOpportunity, RewardSession, FraudEvent, AdminUser, AuditLog } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { admin, adminLogin, adminLogout } = useAuth();
  const [adminEmail, setAdminEmail] = useState('admin@swiftearn.com');
  const [adminPassword, setAdminPassword] = useState('AdminSecure2026!');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'rewards' | 'withdrawals' | 'users' | 'referrals' | 'security' | 'audit_logs' | 'settings'>('withdrawals');
  const [metrics, setMetrics] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<RewardOpportunity[]>([]);
  const [rewardSessions, setRewardSessions] = useState<RewardSession[]>([]);
  const [fraudEvents, setFraudEvents] = useState<FraudEvent[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // User details inspector modal state
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);

  // Withdrawal filters & actions
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('all');
  const [withdrawalSearch, setWithdrawalSearch] = useState<string>('');
  const [selectedWithdrawalDetail, setSelectedWithdrawalDetail] = useState<Withdrawal | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ id: string; type: 'rejected' | 'failed'; reason: string } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOpp, setNewOpp] = useState({
    name: '',
    description: '',
    reward_amount: 10,
    estimated_duration: 30,
    daily_limit: 10,
    provider: 'SwiftEarnInternal',
    category: 'sponsored_task' as 'video' | 'survey' | 'app_trial' | 'sponsored_task',
    status: 'active' as 'active' | 'inactive',
  });

  const [settings, setSettings] = useState<any>({
    minimum_withdrawal: 500,
    maximum_withdrawal: 50000,
    daily_withdrawal_limit: 100000,
    max_pending_withdrawals: 1,
    point_value_naira: 1.0,
    demo_mode: true,
  });
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchAdminData = async () => {
    if (!admin) return;
    try {
      setLoading(true);
      const [overviewRes, withRes, usersRes, logsRes, rewardsRes, settingsRes, refsRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminWithdrawals(),
        api.getAdminUsers(),
        api.getAdminAuditLogs(),
        api.getAdminRewards(),
        api.getAdminSettings().catch(() => ({ config: {} as any })),
        api.getAdminReferrals().catch(() => ({ referrals: [] })),
      ]);
      setMetrics(overviewRes.metrics);
      if (settingsRes?.config) {
        setSettings({
          minimum_withdrawal: settingsRes.config.minimum_withdrawal ?? 500,
          maximum_withdrawal: (settingsRes.config as any).maximum_withdrawal ?? 50000,
          daily_withdrawal_limit: (settingsRes.config as any).daily_withdrawal_limit ?? 100000,
          max_pending_withdrawals: (settingsRes.config as any).max_pending_withdrawals ?? 1,
          point_value_naira: settingsRes.config.point_value_naira ?? 1.0,
          demo_mode: settingsRes.config.demo_mode ?? true,
        });
      } else if (overviewRes.settings) {
        setSettings(overviewRes.settings);
      }
      setWithdrawals(withRes.withdrawals || []);
      setUsersList(usersRes.users || []);
      setReferralsList(refsRes.referrals || []);
      setAuditLogs(logsRes.auditLogs || []);
      setRewardSessions(rewardsRes.sessions || []);
      setFraudEvents(rewardsRes.fraudEvents || []);
      if (rewardsRes.opportunities) {
        setOpportunities(rewardsRes.opportunities);
      } else {
        const oppsRes = await api.getAdminRewardOpportunities().catch(() => ({ opportunities: [] }));
        setOpportunities(oppsRes.opportunities || []);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchAdminData();
    }
  }, [admin]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      setLoading(true);
      await adminLogin(adminEmail, adminPassword);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdcashZone = async () => {
    try {
      setLoading(true);
      await api.createAdminRewardOpportunity({
        id: 'adcash-video-zone-12225346',
        name: 'Adcash Video Ad',
        description: 'Watch a sponsored video advertisement to earn rewards. Verified via Adcash In-Stream delivery.',
        reward_amount: 10,
        estimated_duration: 30,
        daily_limit: 20,
        provider: 'Adcash',
        category: 'video',
        status: 'active',
      } as any);
      showToast('Adcash video zone initialized successfully');
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to initialize Adcash zone');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpportunity = async (id: string) => {
    try {
      await api.toggleAdminRewardOpportunity(id);
      showToast('Reward opportunity status updated');
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to toggle opportunity');
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminRewardOpportunity(newOpp);
      setShowCreateModal(false);
      showToast('New reward opportunity created successfully');
      setNewOpp({
        name: '',
        description: '',
        reward_amount: 10,
        estimated_duration: 30,
        daily_limit: 10,
        provider: 'SwiftEarnInternal',
        category: 'sponsored_task',
        status: 'active',
      });
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to create opportunity');
    }
  };

  const handleUpdateWithdrawalStatus = async (
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed',
    rejectionReason?: string
  ) => {
    try {
      await api.updateWithdrawalStatus(id, {
        status,
        rejectionReason,
        providerReference: status === 'completed' ? `DEMO-PAY-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      });
      showToast(`Withdrawal updated to ${status.toUpperCase()}`);
      setRejectionModal(null);
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to update withdrawal status');
    }
  };

  const handleSimulateDemoPayout = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.simulateAdminDemoPayout(id);
      showToast(res.simulation?.message || 'Simulated demo payout completed');
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Simulation error');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectUser = async (userId: string) => {
    try {
      setLoadingUserDetail(true);
      const detail = await api.getAdminUserDetail(userId);
      setSelectedUserDetail(detail);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch user details');
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await api.updateUserStatus(userId, newStatus);
      showToast(`User status changed to ${newStatus}`);
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to update user status');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updatePlatformSettings(settings);
      showToast('Platform controls and withdrawal rules saved.');
      await fetchAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to save settings');
    }
  };

  const handleReviewReferral = async (id: string, status: string, qualificationStatus: string) => {
    try {
      await api.reviewAdminReferral(id, status, qualificationStatus);
      showToast('Referral status updated successfully.');
      const refsRes = await api.getAdminReferrals();
      setReferralsList(refsRes.referrals || []);
    } catch (err: any) {
      showError(err.message || 'Failed to update referral status');
    }
  };

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 4000);
  };

  // If not logged in as Admin, show Admin Login Box
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center mx-auto shadow-lg mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">Swift Earn</span>
          <h2 className="text-xl font-extrabold text-[#B8F500] mt-1">Admin Portal Access</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Restricted compliance and payout verification dashboard
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-zinc-900 py-8 px-6 rounded-3xl border border-zinc-800 shadow-xl">
            {loginError && (
              <div className="mb-4 bg-red-950/60 border border-red-800 text-red-200 rounded-xl p-3 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-hidden focus:border-[#B8F500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-hidden focus:border-[#B8F500]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
              <span className="text-[11px] text-zinc-500">
                Default Super Admin: <code className="text-[#B8F500]">admin@swiftearn.com</code>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filtered withdrawals list
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter !== 'all' && w.status !== withdrawalFilter) return false;
    if (withdrawalSearch.trim()) {
      const q = withdrawalSearch.toLowerCase().trim();
      const matchRef = w.reference.toLowerCase().includes(q);
      const matchUser = (w as any).user_email?.toLowerCase().includes(q) || w.user_id.toLowerCase().includes(q);
      const matchAcc = (w.account_details?.account_name || (w as any).user_name || '').toLowerCase().includes(q);
      return matchRef || matchUser || matchAcc;
    }
    return true;
  });

  return (
    <div className="bg-[#0F172A] min-h-screen pb-24 md:pb-12 pt-6 text-zinc-100 overflow-x-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center font-black text-lg shrink-0">
              SE
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  Swift Earn Control Panel
                </h1>
                <span className="bg-[#B8F500] text-[#0F172A] font-extrabold text-[10px] px-2 py-0.5 rounded uppercase shrink-0">
                  DEMO MODE
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">
                Logged in as <strong className="text-zinc-200">{admin.email}</strong> ({admin.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={adminLogout}
              className="px-3 py-2 rounded-xl bg-red-950/60 border border-red-800 hover:bg-red-900 text-red-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Platform Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Total Users</span>
            <div className="text-xl sm:text-2xl font-black text-white">{metrics?.totalUsers || usersList.length || 0}</div>
            <span className="text-[10px] text-zinc-500 block truncate">Registered members</span>
          </div>

          <div className="bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Rewards Verified</span>
            <div className="text-xl sm:text-2xl font-black text-[#B8F500]">{metrics?.totalRewardsCompleted || rewardSessions.filter(s => s.status === 'completed').length || 0}</div>
            <span className="text-[10px] text-zinc-500 block truncate">Ad sessions verified</span>
          </div>

          <div className="bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Rewards Issued</span>
            <div className="text-xl sm:text-2xl font-black text-white">₦{(metrics?.totalRewardsIssued || 0).toFixed(2)}</div>
            <span className="text-[10px] text-zinc-500 block truncate">Credited into ledger</span>
          </div>

          <div className="bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Total Withdrawn</span>
            <div className="text-xl sm:text-2xl font-black text-white">₦{(metrics?.totalWithdrawn || 0).toFixed(2)}</div>
            <span className="text-[10px] text-zinc-500 block truncate">Settled to banks</span>
          </div>

          <div className="bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-800 space-y-1 col-span-2 lg:col-span-1">
            <span className="text-[10px] uppercase font-bold text-purple-400">Pending Withdrawals</span>
            <div className="text-xl sm:text-2xl font-black text-[#B8F500]">
              {withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').length}
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">
              ₦{withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + w.amount, 0).toFixed(2)} in queue
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto max-w-full scrollbar-none py-1">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Withdrawals Queue ({withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-[#B8F500]" />
            <span>Reward Engine & Ops ({opportunities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Balances ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Fraud & Security ({fraudEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#B8F500]" />
            <span>Referrals Management ({referralsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'audit_logs'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#B8F500]" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#6C2BD9] text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Platform Controls</span>
          </button>
        </div>

        {/* Tab 1: Withdrawals Queue */}
        {activeTab === 'withdrawals' && (
          <div className="bg-zinc-900 rounded-3xl p-4 sm:p-6 border border-zinc-800 space-y-4 max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Withdrawal Requests Queue</h3>
                  <span className="bg-purple-900 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    {withdrawals.length} Total
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Review, approve, disburse, or refund withdrawals with automated ledger balance reconciliation
                </p>
              </div>

              {/* Status Filter Buttons & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-full">
                <div className="relative w-full sm:w-auto">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search ref or email..."
                    value={withdrawalSearch}
                    onChange={(e) => setWithdrawalSearch(e.target.value)}
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-[#B8F500]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto max-w-full scrollbar-none shrink-0">
                  {['all', 'pending', 'processing', 'completed', 'rejected', 'failed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setWithdrawalFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        withdrawalFilter === st
                          ? 'bg-[#6C2BD9] text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No withdrawal requests matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">User & Account</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Method & Details</th>
                      <th className="p-3">Requested At</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-800/50">
                        <td className="p-3">
                          <div className="font-mono font-bold text-white flex items-center gap-1">
                            <span>{w.reference}</span>
                            <button
                              onClick={() => copyToClipboard(w.reference)}
                              className="text-zinc-500 hover:text-zinc-300"
                              title="Copy reference"
                            >
                              {copiedRef === w.reference ? (
                                <Check className="w-3 h-3 text-[#B8F500]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">ID: {w.id.slice(0, 10)}...</span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">
                            {(w as any).user_name || w.account_details?.account_name || (w as any).account_name || 'User'}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {(w as any).user_email || w.user_id.slice(0, 12)}
                          </div>
                        </td>
                        <td className="p-3 font-extrabold text-[#B8F500] text-sm whitespace-nowrap">
                          ₦{w.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-white capitalize block">
                            {(w.payment_method || (w as any).payout_method || 'bank_transfer').replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-zinc-400 block font-mono">
                            {w.account_details?.bank_name || (w as any).bank_name || w.account_details?.wallet_provider || (w as any).wallet_provider || 'Bank'}: {w.account_details?.account_number || (w as any).account_number || w.account_details?.wallet_account_id || (w as any).wallet_account_id}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400 text-[11px] whitespace-nowrap">
                          {new Date(w.created_at).toLocaleDateString()} at{' '}
                          {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider ${
                              w.status === 'completed'
                                ? 'bg-[#B8F500] text-[#0F172A]'
                                : w.status === 'processing'
                                ? 'bg-blue-900 text-blue-200'
                                : w.status === 'pending'
                                ? 'bg-[#6C2BD9] text-white'
                                : 'bg-red-950 text-red-200'
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedWithdrawalDetail(w)}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors inline-block"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {w.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateWithdrawalStatus(w.id, 'processing')}
                                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors"
                              >
                                Mark Processing
                              </button>
                              <button
                                onClick={() => handleSimulateDemoPayout(w.id)}
                                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-colors"
                                title="Run automated simulation through Demo Settlement Gateway"
                              >
                                Simulate Gateway
                              </button>
                              <button
                                onClick={() => setRejectionModal({ id: w.id, type: 'rejected', reason: '' })}
                                className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-red-200 font-bold text-[11px] transition-colors"
                              >
                                Reject & Refund
                              </button>
                            </>
                          )}

                          {w.status === 'processing' && (
                            <>
                              <button
                                onClick={() => handleUpdateWithdrawalStatus(w.id, 'completed')}
                                className="px-2.5 py-1 rounded bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-[11px] transition-colors"
                              >
                                Confirm Payout
                              </button>
                              <button
                                onClick={() => setRejectionModal({ id: w.id, type: 'failed', reason: '' })}
                                className="px-2.5 py-1 rounded bg-amber-900 hover:bg-amber-800 text-amber-200 font-bold text-[11px] transition-colors"
                              >
                                Fail & Refund
                              </button>
                            </>
                          )}

                          {w.status === 'completed' && (
                            <span className="text-[11px] text-zinc-400 font-mono">
                              Settled ({w.provider_reference || 'Demo Gateway'})
                            </span>
                          )}

                          {(w.status === 'rejected' || w.status === 'failed') && (
                            <span className="text-[11px] text-red-400">
                              Refunded to wallet
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reward Engine & Opportunities */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">Reward Opportunities</h3>
                    <span className="bg-[#B8F500] text-[#0F172A] font-black text-[10px] px-2 py-0.5 rounded uppercase">
                      DEMO & LIVE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Manage catalog of rewarded video, surveys, and partner activities with daily caps
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    onClick={handleSetupAdcashZone}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto cursor-pointer disabled:opacity-50"
                    title="Automatically create the required Adcash video zone record in Supabase"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Setup Adcash Zone</span>
                  </button>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>New Opportunity</span>
                  </button>
                </div>
              </div>

              {opportunities.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">No reward opportunities configured.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Campaign / Name</th>
                        <th className="p-3">Provider</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Reward Points</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Daily Limit</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {opportunities.map((opp) => (
                        <tr key={opp.id} className="hover:bg-zinc-800/50">
                          <td className="p-3">
                            <div className="font-bold text-white">{opp.name || opp.title}</div>
                            <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs">{opp.description}</div>
                          </td>
                          <td className="p-3 font-medium text-zinc-300">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-200">
                              {opp.provider}
                            </span>
                          </td>
                          <td className="p-3 capitalize text-zinc-300">{opp.category || 'video'}</td>
                          <td className="p-3 font-extrabold text-[#B8F500] text-sm">
                            +{opp.reward_amount || opp.reward_points} pts
                          </td>
                          <td className="p-3 text-zinc-300 font-mono text-xs">
                            {opp.estimated_duration || opp.estimated_seconds || 30}s
                          </td>
                          <td className="p-3 text-zinc-300 font-mono text-xs">
                            {opp.daily_limit || opp.daily_cap || 10} / day
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                opp.status === 'active' || opp.active
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              {opp.status || (opp.active ? 'active' : 'inactive')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleOpportunity(opp.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                opp.status === 'active' || opp.active
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                  : 'bg-[#6C2BD9] hover:bg-[#5821B0] text-white'
                              }`}
                            >
                              {opp.status === 'active' || opp.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Reward Sessions Stream */}
            <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">Recent Verified Reward Sessions</h3>
                  <p className="text-xs text-zinc-400">Server-side HMAC validated completions and idempotency keys</p>
                </div>
              </div>

              {rewardSessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">No reward sessions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Session ID</th>
                        <th className="p-3">User ID</th>
                        <th className="p-3">Opportunity</th>
                        <th className="p-3">Reward</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Started</th>
                        <th className="p-3">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {rewardSessions.slice(0, 15).map((s) => (
                        <tr key={s.id} className="hover:bg-zinc-800/50">
                          <td className="p-3 font-mono text-[11px] text-zinc-300">{s.id.slice(0, 12)}...</td>
                          <td className="p-3 font-mono text-[11px] text-zinc-400">{s.user_id.slice(0, 8)}...</td>
                          <td className="p-3 font-medium text-white">{s.opportunity_title || (s as any).opportunity_name || 'Reward Session'}</td>
                          <td className="p-3 font-bold text-[#B8F500]">+{s.reward_amount || (s as any).reward_points} pts</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                s.status === 'completed'
                                  ? 'bg-[#B8F500] text-[#0F172A]'
                                  : s.status === 'started' || s.status === 'initiated'
                                  ? 'bg-blue-900 text-blue-200'
                                  : 'bg-red-950 text-red-200'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-zinc-400">
                            {new Date(s.started_at).toLocaleTimeString()}
                          </td>
                          <td className="p-3 text-[11px] text-zinc-400">
                            {s.completed_at ? new Date(s.completed_at).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Users Management */}
        {activeTab === 'users' && (
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-4">
            <h3 className="text-base font-extrabold text-white">Registered User Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Available Balance</th>
                    <th className="p-3">Total Earned</th>
                    <th className="p-3">Total Withdrawn</th>
                    <th className="p-3">Referral Code</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Account Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/50">
                      <td className="p-3">
                        <div className="font-bold text-white">{u.full_name}</div>
                        <div className="text-[11px] text-zinc-400">{u.email}</div>
                      </td>
                      <td className="p-3 font-extrabold text-[#B8F500]">
                        ₦{(u.available_balance || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-white">₦{(u.total_earned || 0).toFixed(2)}</td>
                      <td className="p-3 text-zinc-400">₦{(u.total_withdrawn || 0).toFixed(2)}</td>
                      <td className="p-3 font-mono text-[#6C2BD9]">{u.referral_code}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-red-950 text-red-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Inspect user profile & ledger history"
                        >
                          <Eye className="w-3 h-3 text-[#B8F500]" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-red-900/60 hover:bg-red-800 text-red-200'
                              : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Unsuspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Fraud Audit Logs */}
        {activeTab === 'security' && (
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">Fraud & Security Telemetry</h3>
                <p className="text-xs text-zinc-400">Real-time anti-abuse detections, risk scores, and security event logs</p>
              </div>
              <span className="bg-red-950 text-red-200 text-xs font-bold px-3 py-1 rounded-xl border border-red-800">
                Total Incidents: {fraudEvents.length}
              </span>
            </div>

            {fraudEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">No fraud security events recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Event ID / Type</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Risk Score</th>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Reason / Description</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {fraudEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-800/50">
                        <td className="p-3 font-mono text-zinc-400">
                          <div className="font-bold text-white">{evt.id}</div>
                          <span className="text-[10px] text-[#B8F500]">{evt.event_type || 'suspicious_activity'}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              evt.severity === 'critical' || evt.severity === 'high'
                                ? 'bg-red-900 text-red-100'
                                : evt.severity === 'medium'
                                ? 'bg-amber-900 text-amber-100'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {evt.severity || 'low'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">
                          {evt.risk_score} / 100
                        </td>
                        <td className="p-3 font-mono text-xs text-zinc-300">
                          {evt.user_id || 'Anonymous'}
                        </td>
                        <td className="p-3 max-w-xs truncate text-zinc-300" title={evt.flag_reason || evt.description}>
                          {evt.flag_reason || evt.description}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evt.resolved
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {evt.resolved ? 'Resolved' : 'Pending Review'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-zinc-400">
                          {new Date(evt.created_at).toLocaleTimeString()}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {!evt.resolved && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.reviewAdminFraudEvent(evt.id, 'Reviewed and cleared by admin', true);
                                  showToast('Fraud event marked resolved.');
                                  const res = await api.getAdminFraudEvents();
                                  setFraudEvents(res.fraudEvents || []);
                                } catch (err: any) {
                                  showError(err.message || 'Failed to resolve fraud event');
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                          {evt.user_id && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.updateAdminUserStatus(evt.user_id!, 'restricted');
                                  showToast(`User ${evt.user_id} restricted.`);
                                } catch (err: any) {
                                  showError(err.message || 'Failed to restrict user');
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-red-100 font-bold text-[10px] cursor-pointer"
                            >
                              Restrict User
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Referrals Management */}
        {activeTab === 'referrals' && (
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">Referrals & Affiliate Program Audits</h3>
                <p className="text-xs text-zinc-400">Monitor unique referral links, qualification milestones, and bonus ledger disbursements</p>
              </div>
              <span className="bg-purple-900 text-purple-200 text-xs font-bold px-3 py-1 rounded-xl">
                Total Referrals: {referralsList.length}
              </span>
            </div>

            {referralsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">No referral relationships recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Referral ID / Code</th>
                      <th className="p-3">Referrer User</th>
                      <th className="p-3">Referred Member</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Qualification</th>
                      <th className="p-3">Reward</th>
                      <th className="p-3">Joined Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {referralsList.map((ref) => (
                      <tr key={ref.id} className="hover:bg-zinc-800/50">
                        <td className="p-3 font-mono text-zinc-400">
                          <div className="font-bold text-white">{ref.id}</div>
                          <span className="text-[10px] text-[#B8F500]">Code: {ref.referral_code || 'N/A'}</span>
                        </td>
                        <td className="p-3 font-mono text-xs text-zinc-300">
                          {ref.referrer_user_id}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{ref.referred_name || 'Member'}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{ref.referred_email}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              ref.status === 'rewarded'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : ref.status === 'qualified'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : ref.status === 'suspicious' || ref.status === 'rejected'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-zinc-300">
                          {ref.qualification_status || 'pending'}
                        </td>
                        <td className="p-3 font-bold text-emerald-400">
                          ₦{(ref.reward_amount || 50).toFixed(2)}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-zinc-400">
                          {new Date(ref.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {ref.status !== 'rewarded' && (
                            <button
                              onClick={() => handleReviewReferral(ref.id, 'rewarded', 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Qualify & Credit
                            </button>
                          )}
                          {ref.status !== 'suspicious' && (
                            <button
                              onClick={() => handleReviewReferral(ref.id, 'suspicious', ref.qualification_status)}
                              className="px-2.5 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-red-100 font-bold text-[10px] cursor-pointer"
                            >
                              Flag
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Platform Settings & Withdrawal Controls */}
        {activeTab === 'settings' && (
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 max-w-3xl space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-white">Platform Controls & Settlement Rules</h3>
              <p className="text-xs text-zinc-400">Configure global withdrawal thresholds, daily caps, and simulation settings</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Minimum Withdrawal (₦)
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={settings.minimum_withdrawal}
                    onChange={(e) =>
                      setSettings({ ...settings, minimum_withdrawal: parseFloat(e.target.value) || 500 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Default threshold: ₦500.00</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Maximum Single Withdrawal (₦)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={settings.maximum_withdrawal}
                    onChange={(e) =>
                      setSettings({ ...settings, maximum_withdrawal: parseFloat(e.target.value) || 50000 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Max per single transaction</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Daily Withdrawal Limit (₦)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="5000"
                    value={settings.daily_withdrawal_limit}
                    onChange={(e) =>
                      setSettings({ ...settings, daily_withdrawal_limit: parseFloat(e.target.value) || 100000 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Max Pending Requests Per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.max_pending_withdrawals}
                    onChange={(e) =>
                      setSettings({ ...settings, max_pending_withdrawals: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Point Exchange Value (1 Point = ₦X)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.point_value_naira}
                    onChange={(e) =>
                      setSettings({ ...settings, point_value_naira: parseFloat(e.target.value) || 1.0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold text-[#B8F500]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Sandbox Settlement Mode
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.demo_mode}
                        onChange={(e) => setSettings({ ...settings, demo_mode: e.target.checked })}
                        className="rounded border-zinc-700 text-[#6C2BD9] focus:ring-[#6C2BD9]"
                      />
                      <span>Demo Mode Active (Simulated Banking Clearing)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Save Platform Controls
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 6: Administrative Audit Logs */}
        {activeTab === 'audit_logs' && (
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">System Audit & Compliance Log</h3>
                <p className="text-xs text-zinc-400">Immutable trace of all administrator actions, payout clearances, user status changes, and platform setting updates</p>
              </div>
              <span className="bg-[#6C2BD9] text-white text-xs font-bold px-3 py-1 rounded-xl">
                {auditLogs.length} Log Records
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">No admin audit log entries recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Log ID</th>
                      <th className="p-3">Admin ID</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target Type / ID</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/50">
                        <td className="p-3 text-zinc-400 font-bold">{log.id.slice(0, 10)}...</td>
                        <td className="p-3 text-zinc-300">{log.admin_id ? log.admin_id.slice(0, 8) + '...' : 'System'}</td>
                        <td className="p-3 font-sans font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                            log.action?.includes('approved') ? 'bg-emerald-950 text-emerald-300' :
                            log.action?.includes('rejected') || log.action?.includes('suspended') ? 'bg-red-950 text-red-300' :
                            'bg-purple-950 text-purple-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-zinc-400">
                          <span className="font-bold text-white capitalize">{log.target_type}</span>: {log.target_id}
                        </td>
                        <td className="p-3 max-w-xs truncate text-zinc-400 font-sans">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '—'}
                        </td>
                        <td className="p-3 text-zinc-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Create Opportunity */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-[#0F172A] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-extrabold text-white">Create Reward Opportunity</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOpportunity} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Opportunity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verified Partner Survey"
                    value={newOpp.name}
                    onChange={(e) => setNewOpp({ ...newOpp, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-hidden focus:border-[#B8F500]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Watch a 30-second partner demonstration..."
                    value={newOpp.description}
                    onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-hidden focus:border-[#B8F500]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                      Reward (Points)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newOpp.reward_amount}
                      onChange={(e) => setNewOpp({ ...newOpp, reward_amount: parseFloat(e.target.value) || 10 })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold text-[#B8F500]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                      Duration (Seconds)
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      value={newOpp.estimated_duration}
                      onChange={(e) => setNewOpp({ ...newOpp, estimated_duration: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                      Daily Limit / User
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newOpp.daily_limit}
                      onChange={(e) => setNewOpp({ ...newOpp, daily_limit: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                      Category
                    </label>
                    <select
                      value={newOpp.category}
                      onChange={(e) => setNewOpp({ ...newOpp, category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold"
                    >
                      <option value="video">Rewarded Video</option>
                      <option value="survey">Interactive Survey</option>
                      <option value="app_trial">App Engagement</option>
                      <option value="sponsored_task">Sponsored Task</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Save Opportunity
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Rejection or Failure Confirmation */}
        {rejectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-[#0F172A] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-base font-extrabold text-white capitalize">
                  {rejectionModal.type === 'rejected' ? 'Reject Withdrawal & Refund' : 'Mark Failed & Refund'}
                </h3>
                <button
                  onClick={() => setRejectionModal(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Confirming this action will automatically refund the full withdrawal amount back to the user's wallet available balance and record a ledger reversal.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Reason for {rejectionModal.type === 'rejected' ? 'Rejection' : 'Failure'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    rejectionModal.type === 'rejected'
                      ? 'e.g. Account name mismatch with registered user profile.'
                      : 'e.g. Destination banking gateway returned invalid account number.'
                  }
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-hidden focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() =>
                    handleUpdateWithdrawalStatus(
                      rejectionModal.id,
                      rejectionModal.type,
                      rejectionModal.reason || (rejectionModal.type === 'rejected' ? 'Administrative policy rejection' : 'Payment gateway clearance failure')
                    )
                  }
                  className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Confirm & Reverse to Wallet
                </button>
                <button
                  onClick={() => setRejectionModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Withdrawal Details Inspector */}
        {selectedWithdrawalDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-[#0F172A] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Withdrawal Inspector</h3>
                  <span className="bg-purple-900 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    DEMO
                  </span>
                </div>
                <button
                  onClick={() => setSelectedWithdrawalDetail(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-4 space-y-2.5 text-xs border border-zinc-800 font-mono">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Reference</span>
                  <span className="text-white font-bold">{selectedWithdrawalDetail.reference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Withdrawal ID</span>
                  <span className="text-zinc-400">{selectedWithdrawalDetail.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">User ID</span>
                  <span className="text-zinc-400">{selectedWithdrawalDetail.user_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Amount</span>
                  <span className="text-[#B8F500] font-bold text-sm">₦{selectedWithdrawalDetail.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Payment Method</span>
                  <span className="text-white capitalize font-sans">{selectedWithdrawalDetail.payment_method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Bank / Provider</span>
                  <span className="text-white">
                    {selectedWithdrawalDetail.account_details?.bank_name || selectedWithdrawalDetail.bank_name || selectedWithdrawalDetail.account_details?.wallet_provider || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Account Number / ID</span>
                  <span className="text-white">
                    {selectedWithdrawalDetail.account_details?.account_number || selectedWithdrawalDetail.account_number || selectedWithdrawalDetail.account_details?.wallet_account_id || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Account Name</span>
                  <span className="text-white font-sans">
                    {selectedWithdrawalDetail.account_details?.account_name || selectedWithdrawalDetail.account_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Status</span>
                  <span className="text-[#B8F500] uppercase font-bold">{selectedWithdrawalDetail.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500 font-sans">Created At</span>
                  <span className="text-zinc-400">{new Date(selectedWithdrawalDetail.created_at).toLocaleString()}</span>
                </div>
                {selectedWithdrawalDetail.processed_at && (
                  <div className="flex justify-between py-1 border-b border-zinc-800">
                    <span className="text-zinc-500 font-sans">Processed At</span>
                    <span className="text-zinc-400">{new Date(selectedWithdrawalDetail.processed_at).toLocaleString()}</span>
                  </div>
                )}
                {selectedWithdrawalDetail.provider_reference && (
                  <div className="flex justify-between py-1 border-b border-zinc-800">
                    <span className="text-zinc-500 font-sans">Provider Reference</span>
                    <span className="text-zinc-300">{selectedWithdrawalDetail.provider_reference}</span>
                  </div>
                )}
                {(selectedWithdrawalDetail.rejection_reason || selectedWithdrawalDetail.admin_notes || selectedWithdrawalDetail.admin_note) && (
                  <div className="py-2 bg-red-950/40 rounded-xl p-3 border border-red-900/50">
                    <span className="font-bold text-red-300 block mb-1 font-sans">Admin Note / Reason:</span>
                    <p className="text-red-200 text-xs font-sans">
                      {selectedWithdrawalDetail.rejection_reason || selectedWithdrawalDetail.admin_notes || selectedWithdrawalDetail.admin_note}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedWithdrawalDetail(null)}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full User Details Inspector */}
        {selectedUserDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-[#0F172A] border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 sticky top-0 bg-[#0F172A] z-10 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-white">User Account Inspector</h3>
                    <span className="bg-[#6C2BD9] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {selectedUserDetail.profile?.role || 'user'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedUserDetail.profile?.id}</p>
                </div>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Profile & Wallet Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Available Balance</span>
                  <div className="text-lg font-black text-[#B8F500]">
                    ₦{(selectedUserDetail.wallet?.available_balance || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Earned</span>
                  <div className="text-lg font-black text-white">
                    ₦{(selectedUserDetail.wallet?.total_earned || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Withdrawn</span>
                  <div className="text-lg font-black text-zinc-300">
                    ₦{(selectedUserDetail.wallet?.total_withdrawn || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Account Status</span>
                  <div className={`text-sm font-black uppercase mt-1 ${
                    selectedUserDetail.profile?.account_status === 'active' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {selectedUserDetail.profile?.account_status || 'active'}
                  </div>
                </div>
              </div>

              {/* Personal & Banking Information */}
              <div className="bg-zinc-950 rounded-2xl p-4 space-y-2 text-xs border border-zinc-800 font-mono">
                <h4 className="font-sans font-extrabold text-white text-xs uppercase text-zinc-400 pb-1 border-b border-zinc-800">
                  Profile & Settlement Banking Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-zinc-500 block font-sans text-[11px]">Full Name</span>
                    <span className="text-white font-bold font-sans">{selectedUserDetail.profile?.full_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-sans text-[11px]">Email Address</span>
                    <span className="text-white">{selectedUserDetail.profile?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-sans text-[11px]">Phone Number</span>
                    <span className="text-zinc-300">{selectedUserDetail.profile?.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-sans text-[11px]">Referral Code</span>
                    <span className="text-[#6C2BD9] font-bold">{selectedUserDetail.profile?.referral_code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-sans text-[11px]">Bank Name</span>
                    <span className="text-zinc-300 font-sans">{selectedUserDetail.profile?.bank_name || 'Not configured'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-sans text-[11px]">Account Number</span>
                    <span className="text-zinc-300">{selectedUserDetail.profile?.account_number || 'Not configured'}</span>
                  </div>
                </div>
              </div>

              {/* Recent Ledger History */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-white text-xs uppercase text-zinc-400">Recent Ledger Activity</h4>
                {selectedUserDetail.ledgerEntries?.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2">No ledger entries for this user.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto bg-zinc-950 rounded-2xl p-3 border border-zinc-800">
                    <table className="w-full text-left text-[11px] text-zinc-300">
                      <thead className="text-zinc-500 uppercase text-[9px] font-bold">
                        <tr>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Description</th>
                          <th className="pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {selectedUserDetail.ledgerEntries?.slice(0, 10).map((l: any) => (
                          <tr key={l.id}>
                            <td className="py-1.5 uppercase font-bold text-zinc-400">{l.entry_type}</td>
                            <td className="py-1.5 font-bold text-[#B8F500]">₦{Number(l.amount).toFixed(2)}</td>
                            <td className="py-1.5 font-sans text-zinc-300 truncate max-w-xs">{l.description}</td>
                            <td className="py-1.5 text-zinc-500">{new Date(l.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Withdrawals */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-white text-xs uppercase text-zinc-400">Withdrawal Requests</h4>
                {selectedUserDetail.withdrawals?.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2">No withdrawal requests found.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto bg-zinc-950 rounded-2xl p-3 border border-zinc-800">
                    <table className="w-full text-left text-[11px] text-zinc-300">
                      <thead className="text-zinc-500 uppercase text-[9px] font-bold">
                        <tr>
                          <th className="pb-2">Ref</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {selectedUserDetail.withdrawals?.map((w: any) => (
                          <tr key={w.id}>
                            <td className="py-1.5 text-zinc-400">{w.reference}</td>
                            <td className="py-1.5 font-bold text-white">₦{Number(w.amount).toFixed(2)}</td>
                            <td className="py-1.5 uppercase font-bold text-[#B8F500]">{w.status}</td>
                            <td className="py-1.5 text-zinc-500">{new Date(w.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Control Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-zinc-800">
                <button
                  onClick={async () => {
                    await handleToggleUserStatus(
                      selectedUserDetail.profile.id,
                      selectedUserDetail.profile.account_status || 'active'
                    );
                    setSelectedUserDetail(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-colors cursor-pointer ${
                    selectedUserDetail.profile?.account_status === 'active'
                      ? 'bg-red-900 hover:bg-red-800 text-white'
                      : 'bg-emerald-800 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {selectedUserDetail.profile?.account_status === 'active' ? 'Suspend User Account' : 'Reactivate User Account'}
                </button>

                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
