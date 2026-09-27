import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Info,
  XCircle,
  Eye,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { WithdrawalRequest } from '../types';
import { api } from '../api';

interface WithdrawPageProps {
  onNavigate: (tab: string) => void;
}

export const WithdrawPage: React.FC<WithdrawPageProps> = ({ onNavigate }) => {
  const { user, wallet, profile, refreshUserData } = useAuth();
  const [amount, setAmount] = useState<string>('500');
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'fintech_wallet'>('bank_transfer');

  // Bank fields
  const [bankName, setBankName] = useState<string>('Access Bank');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankAccountName, setBankAccountName] = useState<string>('');

  // Fintech fields
  const [walletProvider, setWalletProvider] = useState<string>('Opay');
  const [walletAccountId, setWalletAccountId] = useState<string>('');
  const [walletAccountName, setWalletAccountName] = useState<string>('');

  const [minWithdrawal, setMinWithdrawal] = useState<number>(500);
  const [maxWithdrawal, setMaxWithdrawal] = useState<number>(50000);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<any>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [preparedAccountDetails, setPreparedAccountDetails] = useState<Record<string, string>>({});
  const [numericAmountToSubmit, setNumericAmountToSubmit] = useState<number>(0);
  const [paystackConfigured, setPaystackConfigured] = useState<boolean>(false);
  const [paystackModeText, setPaystackModeText] = useState<string>('TEST MODE — NO REAL PAYMENT');

  // Auto-populate from user profile if configured
  useEffect(() => {
    if (profile) {
      if (profile.bank_name) setBankName(profile.bank_name);
      if (profile.account_number) setBankAccountNumber(profile.account_number);
      if (profile.account_name) {
        setBankAccountName(profile.account_name);
        setWalletAccountName(profile.account_name);
      } else if (profile.full_name) {
        setBankAccountName(profile.full_name);
        setWalletAccountName(profile.full_name);
      }
      if (profile.preferred_payment_method) {
        setPayoutMethod(profile.preferred_payment_method);
      }
    }
  }, [profile]);

  const fetchWithdrawalData = async () => {
    try {
      const statsRes = await api.getPublicStats();
      if (statsRes.minimumWithdrawal) setMinWithdrawal(statsRes.minimumWithdrawal);

      try {
        const psStatus = await api.getPaystackStatus();
        setPaystackConfigured(Boolean(psStatus?.configured));
        if (psStatus?.modeText) setPaystackModeText(psStatus.modeText);
      } catch {
        setPaystackConfigured(false);
      }

      if (user) {
        const withRes = await api.getWithdrawals();
        setPendingWithdrawals(withRes.withdrawals || []);
      } else {
        setPendingWithdrawals([]);
      }
    } catch (err: any) {
      if (!err?.message?.includes('Authentication')) {
        console.warn('Notice: Could not load withdrawal data:', err?.message || err);
      }
    }
  };

  useEffect(() => {
    fetchWithdrawalData();
  }, [user?.id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  if (!user) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-12">
        <div className="max-w-md mx-auto px-4 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center mx-auto shadow-xs">
            <ArrowUpRight className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Withdraw Rewards</h2>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              Log in to request withdrawals directly to your Nigerian bank account or verified Fintech wallet (Opay, PalmPay, Moniepoint, Kuda).
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              id="withdraw-guest-login-btn"
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-sm shadow-xs transition-colors"
            >
              Sign In
            </button>
            <button
              id="withdraw-guest-signup-btn"
              onClick={() => onNavigate('signup')}
              className="px-5 py-2.5 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-sm shadow-xs transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleMaxAmount = () => {
    if (wallet) {
      setAmount(Math.floor(wallet.available_balance).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessData(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please specify a valid withdrawal amount.');
      return;
    }

    if (numericAmount < minWithdrawal) {
      setError(`Minimum withdrawal is ₦${minWithdrawal.toFixed(2)}.`);
      return;
    }

    if (numericAmount > maxWithdrawal) {
      setError(`Maximum withdrawal is ₦${maxWithdrawal.toLocaleString('en-US')}.`);
      return;
    }

    if (!wallet || wallet.available_balance < numericAmount) {
      setError('Insufficient available balance for this withdrawal.');
      return;
    }

    const hasActivePending = pendingWithdrawals.some(
      (w) => w.status === 'pending' || w.status === 'processing'
    );
    if (hasActivePending) {
      setError('You already have a pending withdrawal request in queue. Please wait until it finishes processing.');
      return;
    }

    // Validate method fields
    let accountDetails: Record<string, string> = {};
    if (payoutMethod === 'bank_transfer') {
      if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
        setError('Please complete all bank transfer details.');
        return;
      }
      if (bankAccountNumber.trim().length < 10) {
        setError('Bank account number must be at least 10 digits.');
        return;
      }
      accountDetails = {
        bankName,
        accountNumber: bankAccountNumber.trim(),
        accountName: bankAccountName.trim(),
      };
    } else {
      if (!walletProvider.trim() || !walletAccountId.trim() || !walletAccountName.trim()) {
        setError('Please complete all fintech wallet details.');
        return;
      }
      accountDetails = {
        walletProvider,
        walletAccountId: walletAccountId.trim(),
        accountName: walletAccountName.trim(),
      };
    }

    setNumericAmountToSubmit(numericAmount);
    setPreparedAccountDetails(accountDetails);
    setShowConfirmModal(true);
  };

  const confirmAndSubmitWithdrawal = async () => {
    try {
      setLoading(true);
      setShowConfirmModal(false);
      const res = await api.requestWithdrawal({
        amount: numericAmountToSubmit,
        paymentMethod: payoutMethod,
        accountDetails: preparedAccountDetails,
      });

      if (res.withdrawal) {
        setSuccessData(res.withdrawal);
        await refreshUserData();
        const updatedList = await api.getWithdrawals();
        setPendingWithdrawals(updatedList.withdrawals || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  const nigerianBanks = [
    'Access Bank',
    'Zenith Bank',
    'Guaranty Trust Bank (GTBank)',
    'First Bank of Nigeria',
    'United Bank for Africa (UBA)',
    'Fidelity Bank',
    'Stanbic IBTC Bank',
    'Kuda Bank',
    'Sterling Bank',
    'Wema Bank',
    'Union Bank',
    'FCMB',
  ];

  const fintechProviders = [
    'Opay',
    'Palmpay',
    'Kuda Microfinance Bank',
    'Moniepoint Microfinance Bank',
    'Chipper Cash',
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-wallet"
              onClick={() => onNavigate('wallet')}
              className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#6C2BD9]">
                Settlement Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                Withdraw Rewards
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#B8F500]/20 border border-[#B8F500] px-3 py-1.5 rounded-full text-xs font-bold text-[#0F172A]">
            <Sparkles className="w-3.5 h-3.5 text-[#6C2BD9]" />
            <span>{paystackConfigured ? 'LIVE PAYSTACK GATEWAY' : 'DEMO TEST MODE'}</span>
          </div>
        </div>

        {/* Notice Banner */}
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${paystackConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <Info className={`w-5 h-5 shrink-0 mt-0.5 ${paystackConfigured ? 'text-emerald-700' : 'text-amber-700'}`} />
          <div className={`text-xs leading-relaxed ${paystackConfigured ? 'text-emerald-900' : 'text-amber-900'}`}>
            <strong className="font-bold">
              {paystackConfigured ? 'LIVE PAYSTACK PAYOUTS ACTIVE:' : 'DEMO ENVIRONMENT NOTICE:'}
            </strong>{' '}
            {paystackConfigured
              ? 'Withdrawals are processed directly via Paystack Transfers to verified Nigerian bank accounts upon admin authorization.'
              : 'This application operates in test mode. Withdrawal requests simulate the Nigerian banking clearing queue without moving real fiat currency. All ledger debits and reversals are fully tracked in your balance.'}
          </div>
        </div>

        {/* Available Balance Reminder Card */}
        <div className="bg-[#6C2BD9] text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold text-purple-200 tracking-wider">
              Available Balance
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1">
              ₦{wallet?.available_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-purple-200 mt-0.5">
              Minimum withdrawal threshold: <strong className="text-[#B8F500]">₦{minWithdrawal.toFixed(2)}</strong> • Maximum: <strong className="text-purple-100">₦{maxWithdrawal.toLocaleString('en-US')}</strong>
            </p>
          </div>

          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold ${paystackConfigured ? 'bg-emerald-950/60 border border-emerald-400/40 text-emerald-100' : 'bg-purple-900/50 border border-purple-400/30 text-purple-100'}`}>
            <ShieldCheck className={`w-4 h-4 ${paystackConfigured ? 'text-emerald-400' : 'text-[#B8F500]'}`} />
            <span>{paystackConfigured ? 'LIVE PAYSTACK PAYOUTS' : 'TEST MODE — NO REAL PAYMENT'}</span>
          </div>
        </div>

        {/* Success Confirmation Card */}
        {successData && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-md space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#B8F500] text-[#0F172A] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900">
                  Withdrawal Request Submitted
                </h3>
                <p className="text-xs text-zinc-500">
                  Your payout has entered the security queue and will be processed automatically in Demo Mode.
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500">Reference Number</span>
                <span className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                  {successData.reference}
                  <button
                    onClick={() => copyToClipboard(successData.reference)}
                    className="text-zinc-400 hover:text-zinc-700"
                    title="Copy reference"
                  >
                    {copiedRef === successData.reference ? (
                      <Check className="w-3.5 h-3.5 text-[#6C2BD9]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500">Amount</span>
                <span className="font-bold text-[#6C2BD9] text-sm">₦{successData.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500">Payout Channel</span>
                <span className="font-medium text-zinc-800 capitalize">
                  {(successData.payment_method || (successData as any).payout_method || 'bank_transfer').replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Current Status</span>
                <span className="bg-[#B8F500] text-[#0F172A] font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                  {successData.status} (Demo Mode)
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSuccessData(null)}
                className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors"
              >
                Submit Another Request
              </button>
              <button
                onClick={() => onNavigate('wallet')}
                className="flex-1 py-3 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-xs transition-colors"
              >
                Go to Wallet
              </button>
            </div>
          </div>
        )}

        {/* Withdrawal Form */}
        {!successData && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs">
            {error && (
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-900">
                <AlertCircle className="w-4 h-4 text-[#6C2BD9] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Withdrawal Amount (₦)
                  </label>
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    className="text-xs font-bold text-[#6C2BD9] hover:underline"
                  >
                    Withdraw Max
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-zinc-400 text-lg">
                    ₦
                  </span>
                  <input
                    id="input-withdraw-amount"
                    type="number"
                    min={minWithdrawal}
                    max={maxWithdrawal}
                    step="10"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-lg font-bold"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-400 mt-1">
                  <span>Minimum threshold: ₦{minWithdrawal.toFixed(2)}</span>
                  <span>Maximum limit: ₦{maxWithdrawal.toLocaleString('en-US')}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Select Payout Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="method-bank-transfer"
                    onClick={() => setPayoutMethod('bank_transfer')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      payoutMethod === 'bank_transfer'
                        ? 'border-[#6C2BD9] bg-purple-50/50 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center font-bold shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Direct Bank Transfer</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">All commercial Nigerian banks</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="method-fintech-wallet"
                    onClick={() => setPayoutMethod('fintech_wallet')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      payoutMethod === 'fintech_wallet'
                        ? 'border-[#6C2BD9] bg-purple-50/50 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 text-[#B8F500] flex items-center justify-center font-bold shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Fintech Wallet</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Opay, Palmpay, Moniepoint, Kuda</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Account Details: Bank Transfer */}
              {payoutMethod === 'bank_transfer' ? (
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Bank Name
                    </label>
                    <select
                      id="select-bank-name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] text-sm font-medium"
                    >
                      {nigerianBanks.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Account Number (10 Digits)
                    </label>
                    <input
                      id="input-bank-account-number"
                      type="text"
                      maxLength={10}
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="0123456789"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Account Name
                    </label>
                    <input
                      id="input-bank-account-name"
                      type="text"
                      required
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="Account holder full name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] text-sm"
                    />
                  </div>
                </div>
              ) : (
                /* Dynamic Account Details: Fintech Wallet */
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Fintech Provider
                    </label>
                    <select
                      id="select-fintech-provider"
                      value={walletProvider}
                      onChange={(e) => setWalletProvider(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] text-sm font-medium"
                    >
                      {fintechProviders.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Registered Phone Number / Account ID
                    </label>
                    <input
                      id="input-fintech-account-id"
                      type="text"
                      required
                      value={walletAccountId}
                      onChange={(e) => setWalletAccountId(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Account Name
                    </label>
                    <input
                      id="input-fintech-account-name"
                      type="text"
                      required
                      value={walletAccountName}
                      onChange={(e) => setWalletAccountName(e.target.value)}
                      placeholder="Full name registered on wallet"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  id="btn-submit-withdrawal"
                  type="submit"
                  disabled={loading || (wallet && wallet.available_balance < minWithdrawal)}
                  className="w-full py-4 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Verifying and submitting...</span>
                  ) : (
                    <>
                      <span>Request Withdrawal (Demo Settlement)</span>
                      <ArrowUpRight className="w-4 h-4 text-[#B8F500]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Withdrawal Statuses & Queue Explained */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm">
            <Info className="w-4 h-4 text-[#6C2BD9]" />
            <span>How Swift Earn Processes Payouts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="font-extrabold text-purple-700 uppercase block mb-1">1. Pending</span>
              <p className="text-zinc-500 leading-relaxed">Request debited from balance & verified against anti-fraud rules.</p>
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="font-extrabold text-blue-700 uppercase block mb-1">2. Processing</span>
              <p className="text-zinc-500 leading-relaxed">Dispatched to Nigerian banking settlement clearing network.</p>
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="font-extrabold text-emerald-700 uppercase block mb-1">3. Completed</span>
              <p className="text-zinc-500 leading-relaxed">Transaction settled & verified. Ref logged to ledger.</p>
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="font-extrabold text-rose-600 uppercase block mb-1">4. Rejected / Failed</span>
              <p className="text-zinc-500 leading-relaxed">Invalid details or account flag. 100% refunded to wallet.</p>
            </div>
          </div>
        </div>

        {/* User's Withdrawal History */}
        {pendingWithdrawals.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900">Your Withdrawal History</h3>
              <span className="text-xs text-zinc-400 font-medium">{pendingWithdrawals.length} total</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {pendingWithdrawals.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedWithdrawal(w)}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-zinc-50/80 px-2 -mx-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900 flex items-center gap-2">
                      <span>₦{w.amount.toFixed(2)}</span>
                      <span className="text-zinc-400 font-normal">via</span>
                      <span className="text-zinc-700 font-medium capitalize">
                        {(w.payment_method || (w as any).payout_method || 'bank_transfer').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                      <span>{w.reference}</span>
                      <span>•</span>
                      <span>{new Date(w.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                      onClick={() => copyToClipboard(selectedWithdrawal.reference)}
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

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-zinc-900">Confirm Withdrawal Request</h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-purple-200/50">
                  <span className="text-zinc-500 font-medium">Amount:</span>
                  <span className="font-black text-zinc-900 text-sm">₦{numericAmountToSubmit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-200/50">
                  <span className="text-zinc-500 font-medium">Payment method:</span>
                  <span className="font-bold text-[#6C2BD9] capitalize">
                    {payoutMethod === 'bank_transfer' ? 'Bank Transfer' : 'Fintech Wallet'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-200/50">
                  <span className="text-zinc-500 font-medium">Provider:</span>
                  <span className="font-medium text-zinc-800">
                    {payoutMethod === 'bank_transfer' ? preparedAccountDetails.bankName : preparedAccountDetails.walletProvider}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-200/50">
                  <span className="text-zinc-500 font-medium">Account Name:</span>
                  <span className="font-medium text-zinc-800">{preparedAccountDetails.accountName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500 font-medium">Account:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    ******{(preparedAccountDetails.accountNumber || preparedAccountDetails.walletAccountId || '').slice(-4)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                You will receive your withdrawal after it has been reviewed and processed.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAndSubmitWithdrawal}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
