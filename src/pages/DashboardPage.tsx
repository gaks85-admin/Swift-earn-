import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  ArrowRight,
  Wallet as WalletIcon,
  ChevronRight,
  Zap,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { LedgerEntry } from '../types';
import { api } from '../api';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onStartRewardOpportunity?: (opportunity: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
}) => {
  const { user, profile, wallet } = useAuth();
  const [recentTransactions, setRecentTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const txRes = await api.getTransactions();
        setRecentTransactions((txRes.transactions || []).slice(0, 5));
      } catch (err: any) {
        if (!err?.message?.includes('Authentication')) {
          console.warn('Notice: Could not load dashboard transactions:', err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-12">
        <div className="max-w-md mx-auto px-4 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Member Dashboard</h2>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              Log in to access your personal dashboard, track verified wallet balances, and manage your payouts.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              id="dashboard-guest-login-btn"
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              id="dashboard-guest-signup-btn"
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

  const firstName = profile?.full_name?.split(' ')[0] || 'Member';

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6C2BD9]">
              Account Overview
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Welcome back, {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Ledger Active
            </span>
          </div>
        </div>

        {/* Main Balance Card & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Available Balance Card (Spans 2 columns on desktop) */}
          <div
            id="dashboard-balance-card"
            className="bg-[#6C2BD9] text-white rounded-3xl p-6 sm:p-8 lg:col-span-2 shadow-xl shadow-purple-900/10 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Available Balance
                </span>
                <span className="bg-[#B8F500] text-[#0F172A] font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authoritative
                </span>
              </div>

              {/* Authoritative Balance */}
              <div className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-white">
                ₦{wallet?.available_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-purple-200 mt-1">
                Verified rewards recorded in your double-entry ledger
              </p>
            </div>

            {/* Balances: Pending, Total Earned, Total Withdrawn */}
            <div className="pt-6 border-t border-purple-500/40 mt-6 grid grid-cols-3 gap-2 text-left">
              <div>
                <span className="text-[11px] font-semibold text-purple-200 block uppercase">
                  Pending Rewards
                </span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5 block">
                  ₦{(wallet?.pending_balance ?? wallet?.pending_rewards ?? 0).toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-purple-200 block uppercase">
                  Total Earned
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[#B8F500] mt-0.5 block">
                  ₦{(wallet?.total_earned ?? 0).toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-purple-200 block uppercase">
                  Total Withdrawn
                </span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5 block">
                  ₦{(wallet?.total_withdrawn ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action & Withdraw Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6C2BD9] flex items-center justify-center font-bold mb-4">
                <WalletIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900">Wallet Actions</h3>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                Withdraw confirmed funds directly to your verified bank account or fintech wallet.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-100">
              <button
                id="btn-dashboard-withdraw"
                onClick={() => onNavigate('withdraw')}
                className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-black text-[#B8F500] font-extrabold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Withdraw Rewards</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                id="btn-dashboard-view-wallet"
                onClick={() => onNavigate('wallet')}
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                View Transaction Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Explore Partner Monetization Banner */}
        <div
          id="dashboard-earn-now-cta"
          className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md relative overflow-hidden"
        >
          <div className="space-y-2 text-center sm:text-left z-10">
            <div className="inline-flex items-center gap-1.5 bg-[#B8F500]/20 text-[#B8F500] text-xs font-bold px-2.5 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 fill-[#B8F500]" />
              <span>Partner Monetization</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Explore Swift Earn Rewards
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Complete verified earning opportunities and browse sponsored partner content.
            </p>
          </div>

          <motion.button
            id="btn-earn-now-main"
            whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
            whileTap={{ scale: 0.96, transition: { type: 'spring', stiffness: 500, damping: 15 } }}
            onClick={() => onNavigate('earn')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-black text-base shadow-lg shadow-[#B8F500]/15 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer select-none touch-manipulation"
          >
            <span>Start Earning</span>
            <ArrowRight className="w-5 h-5 text-[#0F172A]" />
          </motion.button>
        </div>

        {/* Partner Advertising & Infrastructure Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">Partner Advertising & Monetization</h2>
              <p className="text-xs text-zinc-500">Live display units supporting Swift Earn infrastructure</p>
            </div>
            <button
              onClick={() => onNavigate('earn')}
              className="text-xs font-bold text-[#6C2BD9] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Earn Hub</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Active 300x250 Banner */}
            <motion.div
              onClick={() => onNavigate('earn')}
              whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 500, damping: 15 } }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate('earn');
                }
              }}
              className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col justify-between cursor-pointer select-none touch-manipulation hover:border-purple-200 hover:shadow-md transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide border border-emerald-200">
                    Active Partner
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    300 × 250
                  </span>
                </div>

                <h3 className="text-sm font-bold text-zinc-900">Sponsored Display Content</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Verified partner display running in our isolated sandbox. View real-time placement and partner disclosure on the Earn page.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-400">Status: Live</span>
                <span className="font-bold text-[#6C2BD9] flex items-center gap-1">
                  <span>View Placement</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>

            {/* Card 2: Financial Integrity & Real-Money Security */}
            <motion.div
              onClick={() => onNavigate('wallet')}
              whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 500, damping: 15 } }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate('wallet');
                }
              }}
              className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col justify-between cursor-pointer select-none touch-manipulation hover:border-purple-200 hover:shadow-md transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-purple-100 text-[#6C2BD9] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Double-Entry
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Audited
                  </span>
                </div>

                <h3 className="text-sm font-bold text-zinc-900">Authoritative Ledger Protection</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  User balances are decoupled from ad impressions. Real money transfers and reward points are cryptographically validated.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-400">Ledger: Immutable</span>
                <span className="font-bold text-[#6C2BD9] flex items-center gap-1">
                  <span>Review Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Recent Activity (Authoritative User Transactions Only) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">Recent Activity</h2>
              <p className="text-xs text-zinc-500">Verified transactions recorded in your double-entry ledger</p>
            </div>
            <button
              onClick={() => onNavigate('wallet')}
              className="text-xs font-bold text-[#6C2BD9] hover:underline cursor-pointer"
            >
              Full Ledger
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No recent activity recorded yet. Authoritative reward credits and withdrawals will appear here.
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPositive
                            ? 'bg-[#B8F500]/30 text-[#0F172A]'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {isPositive ? (
                          <Sparkles className="w-4 h-4 text-[#6C2BD9]" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-zinc-700" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900">{tx.description}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-zinc-400">{tx.reference}</span>
                          <span className="text-[11px] text-zinc-400">
                            • {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs sm:text-sm font-extrabold ${
                          isPositive ? 'text-[#6C2BD9]' : 'text-zinc-900'
                        }`}
                      >
                        {isPositive ? '+' : ''}₦{Math.abs(tx.amount).toFixed(2)}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
