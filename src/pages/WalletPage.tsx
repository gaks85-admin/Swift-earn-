import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  ArrowUpRight,
  Sparkles,
  Copy,
  Check,
  Building2,
  Smartphone,
  Eye,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { LedgerEntry, WithdrawalRequest } from '../types';
import { api } from '../api';

interface WalletPageProps {
  onNavigate: (tab: string) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ onNavigate }) => {
  const { user, wallet } = useAuth();
  const [activeView, setActiveView] = useState<'transactions' | 'withdrawals'>('transactions');
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);

  const fetchingRef = useRef<boolean>(false);
  const latestRequestIdRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user?.id) {
        setTransactions([]);
        setWithdrawals([]);
        setLoading(false);
        return;
      }

      // Deduplication guard: if a request is already running, avoid duplicate concurrent triggers
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      const requestId = ++latestRequestIdRef.current;

      // Only show full-screen skeleton if we have no loaded data yet
      if (transactions.length === 0 && withdrawals.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [txRes, withRes] = await Promise.all([
          api.getTransactions(),
          api.getWithdrawals(),
        ]);

        if (isMounted && requestId === latestRequestIdRef.current) {
          setTransactions(txRes.transactions || []);
          setWithdrawals(withRes.withdrawals || []);
        }
      } catch (err: any) {
        if (!err?.message?.includes('Authentication')) {
          console.warn('Notice: Could not load wallet data:', err?.message || err);
        }
      } finally {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
        fetchingRef.current = false;
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  if (!user) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-12">
        <div className="max-w-md mx-auto px-4 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center mx-auto shadow-xs">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Your Confirmed Wallet</h2>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              Log in or create a free account to track your verified reward points and request withdrawals.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              id="wallet-guest-login-btn"
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              id="wallet-guest-signup-btn"
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

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    if (filterType === 'rewards') return tx.entry_type === 'reward_credit' || tx.type === 'reward';
    if (filterType === 'withdrawals') return tx.entry_type === 'withdrawal_debit' || tx.entry_type === 'withdrawal_reversal' || tx.type === 'withdrawal';
    if (filterType === 'referrals') return tx.entry_type === 'referral_bonus' || tx.type === 'referral';
    return true;
  });

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              My Wallet
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Manage your balance, request withdrawals, and track your ledger entries.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#B8F500]/20 border border-[#B8F500] px-3 py-1.5 rounded-full text-xs font-bold text-[#0F172A]">
            <Sparkles className="w-3.5 h-3.5 text-[#6C2BD9]" />
            <span>DEMO SETTLEMENT</span>
          </div>
        </div>

        {/* Withdrawal Request Card */}
        <div
          id="wallet-large-balance-card"
          className="bg-[#6C2BD9] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Available Confirmed Balance
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1">
                ₦{wallet?.available_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-purple-200 mt-1">
                Ready for instant withdrawal request
              </p>
            </div>

            <button
              id="btn-wallet-balance-withdraw"
              onClick={() => onNavigate('withdraw')}
              className="px-8 py-3.5 rounded-2xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-black text-sm transition-all shadow-md self-start sm:self-auto flex items-center gap-2 cursor-pointer"
            >
              <span>Withdraw Funds</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-6 border-t border-purple-500/40 mt-6 grid grid-cols-3 gap-2 text-left">
            <div>
              <span className="text-[11px] font-semibold text-purple-200 block uppercase">
                Pending Balance
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

        {/* View Switcher: Ledger Entries vs Withdrawals */}
        <div className="flex gap-2 border-b border-zinc-200 pb-2">
          <button
            onClick={() => setActiveView('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'transactions'
                ? 'bg-[#6C2BD9] text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Ledger History ({transactions.length})
          </button>
          <button
            onClick={() => setActiveView('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'withdrawals'
                ? 'bg-[#6C2BD9] text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Withdrawals Queue ({withdrawals.length})
          </button>
        </div>

        {activeView === 'transactions' ? (
          /* Transaction History Section */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-zinc-900">Ledger Transactions</h2>
                  {isRefreshing && (
                    <span className="text-[10px] font-bold text-[#6C2BD9] bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full animate-pulse">
                      Updating...
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">Immutable double-entry log of rewards, withdrawals, and reversals</p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['all', 'rewards', 'withdrawals', 'referrals'].map((ft) => (
                  <button
                    key={ft}
                    onClick={() => setFilterType(ft)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                      filterType === ft
                        ? 'bg-[#6C2BD9] text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {ft}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions List */}
            {loading ? (
              <div className="py-12 text-center text-zinc-400 text-sm">Loading ledger history...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold">No transactions found.</p>
                <p className="text-xs text-zinc-400">Complete video ads to start building your ledger.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredTransactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 rounded-xl px-2 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isPositive
                              ? 'bg-[#B8F500]/30 text-[#0F172A]'
                              : 'bg-zinc-800 text-white'
                          }`}
                        >
                          {isPositive ? (
                            <Sparkles className="w-5 h-5 text-[#6C2BD9]" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">{tx.description}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <button
                              onClick={() => handleCopyRef(tx.reference || tx.reference_id || '')}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              title="Copy reference code"
                            >
                              <span>{tx.reference || tx.reference_id}</span>
                              {copiedRef === (tx.reference || tx.reference_id) ? (
                                <Check className="w-3 h-3 text-[#6C2BD9]" />
                              ) : (
                                <Copy className="w-3 h-3 text-zinc-400" />
                              )}
                            </button>
                            <span className="text-[11px] text-zinc-400">
                              {new Date(tx.created_at).toLocaleDateString()} at{' '}
                              {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pl-13 sm:pl-0">
                        <span
                          className={`text-sm sm:text-base font-black ${
                            isPositive ? 'text-[#6C2BD9]' : 'text-zinc-900'
                          }`}
                        >
                          {isPositive ? '+' : ''}₦{Math.abs(tx.amount).toFixed(2)}
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide mt-0.5 ${
                            tx.status === 'confirmed'
                              ? 'bg-[#B8F500] text-[#0F172A]'
                              : tx.status === 'pending'
                              ? 'bg-purple-100 text-[#6C2BD9]'
                              : 'bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Withdrawals History Section */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900">Withdrawal Requests</h2>
                <p className="text-xs text-zinc-500">Track the settlement lifecycle of all your withdrawal requests</p>
              </div>
              <button
                onClick={() => onNavigate('withdraw')}
                className="px-4 py-2 bg-[#6C2BD9] hover:bg-[#5821B0] text-white text-xs font-bold rounded-xl transition-colors"
              >
                New Request
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-zinc-400 text-sm">Loading withdrawals...</div>
            ) : withdrawals.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold">No withdrawals requested yet.</p>
                <p className="text-xs text-zinc-400">Earn rewards and submit your payout request.</p>
                <button
                  onClick={() => onNavigate('withdraw')}
                  className="mt-2 px-5 py-2.5 bg-[#6C2BD9] text-white rounded-xl text-xs font-bold"
                >
                  Request Payout
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWithdrawal(w)}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 px-2 -mx-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900">
                            ₦{w.amount.toFixed(2)} via {(w.payment_method || (w as any).payout_method || 'bank_transfer').replace('_', ' ')}
                          </h4>
                          <span className="bg-purple-100 text-[#6C2BD9] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            DEMO
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                          <span>{w.reference}</span>
                          <span>•</span>
                          <span>{new Date(w.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                      <span
                        className={`font-extrabold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${
                          w.status === 'completed'
                            ? 'bg-[#B8F500] text-[#0F172A]'
                            : w.status === 'pending'
                            ? 'bg-purple-100 text-[#6C2BD9]'
                            : w.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {w.status}
                      </span>
                      <Eye className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Withdrawal Details Modal */}
        {selectedWithdrawal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-zinc-900">Withdrawal Details</h3>
                  <span className="bg-purple-100 text-[#6C2BD9] text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                    DEMO
                  </span>
                </div>
                <button
                  onClick={() => setSelectedWithdrawal(null)}
                  className="text-zinc-400 hover:text-zinc-700 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="bg-zinc-50 rounded-2xl p-4 space-y-3 text-xs border border-zinc-200">
                <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Reference Number</span>
                  <span className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                    {selectedWithdrawal.reference}
                    <button
                      onClick={() => handleCopyRef(selectedWithdrawal.reference)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      {copiedRef === selectedWithdrawal.reference ? (
                        <Check className="w-3.5 h-3.5 text-[#6C2BD9]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Amount</span>
                  <span className="text-base font-black text-[#6C2BD9]">
                    ₦{selectedWithdrawal.amount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Status</span>
                  <span
                    className={`font-extrabold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${
                      selectedWithdrawal.status === 'completed'
                        ? 'bg-[#B8F500] text-[#0F172A]'
                        : selectedWithdrawal.status === 'pending'
                        ? 'bg-purple-100 text-[#6C2BD9]'
                        : selectedWithdrawal.status === 'processing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedWithdrawal.status}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Payment Channel</span>
                  <span className="font-medium text-zinc-800 capitalize">
                    {(selectedWithdrawal.payment_method || (selectedWithdrawal as any).payout_method || 'bank_transfer').replace('_', ' ')}
                  </span>
                </div>

                {selectedWithdrawal.account_details?.bank_name && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Bank Name</span>
                    <span className="font-medium text-zinc-800">{selectedWithdrawal.account_details.bank_name}</span>
                  </div>
                )}

                {selectedWithdrawal.account_details?.wallet_provider && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Fintech Provider</span>
                    <span className="font-medium text-zinc-800">{selectedWithdrawal.account_details.wallet_provider}</span>
                  </div>
                )}

                {(selectedWithdrawal.account_details?.account_number || selectedWithdrawal.account_details?.wallet_account_id) && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Destination Account</span>
                    <span className="font-mono font-medium text-zinc-800">
                      {(selectedWithdrawal.account_details?.account_number || selectedWithdrawal.account_details?.wallet_account_id)?.replace(/^(\d{2})\d+(\d{3})$/, '$1*****$2')}
                    </span>
                  </div>
                )}

                {selectedWithdrawal.account_details?.account_name && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Account Name</span>
                    <span className="font-medium text-zinc-800">{selectedWithdrawal.account_details.account_name}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Requested On</span>
                  <span className="font-medium text-zinc-800">
                    {new Date(selectedWithdrawal.created_at).toLocaleString()}
                  </span>
                </div>

                {selectedWithdrawal.processed_at && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Settled On</span>
                    <span className="font-medium text-zinc-800">
                      {new Date(selectedWithdrawal.processed_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedWithdrawal.provider_reference && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Gateway Provider Ref</span>
                    <span className="font-mono text-zinc-800 text-[11px]">{selectedWithdrawal.provider_reference}</span>
                  </div>
                )}

                {(selectedWithdrawal.rejection_reason || selectedWithdrawal.admin_notes || selectedWithdrawal.admin_note) && (
                  <div className="py-2 bg-amber-50/80 rounded-xl p-3 border border-amber-200/80">
                    <span className="font-bold text-amber-900 block mb-1">Status Note:</span>
                    <p className="text-amber-800 leading-relaxed">
                      {selectedWithdrawal.rejection_reason || selectedWithdrawal.admin_notes || selectedWithdrawal.admin_note}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="w-full py-3 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
