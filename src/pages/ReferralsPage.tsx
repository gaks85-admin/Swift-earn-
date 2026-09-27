import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Copy,
  Check,
  Sparkles,
  Share2,
  Gift,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ReferralSummary } from '../types';
import { api } from '../api';

interface ReferralsPageProps {
  onNavigate?: (tab: string) => void;
}

export const ReferralsPage: React.FC<ReferralsPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.getReferralSummary();
        setData(res);
      } catch (err: any) {
        if (!err?.message?.includes('Authentication')) {
          console.warn('Notice: Could not load referral summary:', err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReferralData();
  }, [user?.id]);

  const referralCode = profile?.referral_code || 'SE-DEMO1';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!user) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-12">
        <div className="max-w-md mx-auto px-4 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Referral Program</h2>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              Earn ₦50.00 confirmed reward bonus for every new member you invite who completes their first verified opportunity. Log in to get your custom referral link.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              id="referrals-guest-login-btn"
              onClick={() => onNavigate?.('login')}
              className="px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-sm shadow-xs transition-colors"
            >
              Sign In
            </button>
            <button
              id="referrals-guest-signup-btn"
              onClick={() => onNavigate?.('signup')}
              className="px-5 py-2.5 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-sm shadow-xs transition-colors"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#6C2BD9]">
            Affiliate Growth
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Refer Friends & Earn
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Invite your community to Swift Earn and receive confirmed bonus cash when they complete their first reward.
          </p>
        </div>

        {/* Hero Bonus Banner */}
        <div
          id="referral-banner"
          className="bg-[#6C2BD9] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div className="space-y-2 z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-[#B8F500] text-[#0F172A] text-xs font-extrabold px-3 py-1 rounded-full">
              <Gift className="w-3.5 h-3.5" />
              <span>₦50.00 Instant Cash Bonus</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Earn ₦50.00 for every friend who joins
            </h2>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Earn ₦50.00 for every friend who signs up and completes their first reward. No earning cap.
            </p>
          </div>

          <div className="bg-purple-900/60 border border-purple-400/30 p-4 rounded-2xl shrink-0 text-center sm:text-right">
            <span className="text-xs uppercase font-bold text-purple-200">Your Referral Code</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#B8F500] mt-1 tracking-wider">
              {referralCode}
            </div>
          </div>
        </div>

        {/* Share Links Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-5">
          <h3 className="text-base font-extrabold text-zinc-900">Your Sharing Links</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Referral Link Box */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Unique Referral Link
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="bg-white px-3 py-2 rounded-xl border border-zinc-300 text-xs font-mono text-zinc-800 flex-1 min-w-0 focus:outline-hidden truncate"
                />
                <button
                  id="btn-copy-referral-link"
                  onClick={handleCopyLink}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#B8F500]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Referral Code Box */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Unique Referral Code
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  readOnly
                  value={referralCode}
                  className="bg-white px-3 py-2 rounded-xl border border-zinc-300 text-sm font-mono font-bold text-zinc-900 flex-1 min-w-0 focus:outline-hidden truncate"
                />
                <button
                  id="btn-copy-referral-code"
                  onClick={handleCopyCode}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-[#B8F500] text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Referrals</span>
            <div className="text-3xl font-black text-zinc-900">
              {data?.stats?.totalReferrals || 0}
            </div>
            <p className="text-xs text-zinc-500">Friends registered with your code</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Successful Referrals</span>
            <div className="text-3xl font-black text-[#6C2BD9]">
              {data?.stats?.successfulReferrals || 0}
            </div>
            <p className="text-xs text-zinc-500">Friends who completed first reward</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Referral Earnings</span>
            <div className="text-3xl font-black text-zinc-900">
              ₦{(data?.stats?.totalEarned || 0).toFixed(2)}
            </div>
            <p className="text-xs text-zinc-500">Directly deposited into your ledger</p>
          </div>
        </div>

        {/* Referral List */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-zinc-900">Referred Members</h3>

          {loading ? (
            <div className="py-10 text-center text-xs text-zinc-400">Loading your referral list...</div>
          ) : !data?.referrals || data.referrals.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6C2BD9] mx-auto flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-zinc-800">You haven't invited anyone yet.</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Share your referral link on social media or with friends to start earning ₦50.00 bonuses.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {data.referrals.map((ref) => (
                <div key={ref.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C2BD9] font-bold text-xs flex items-center justify-center">
                      {ref.referred_name ? ref.referred_name.slice(0, 2).toUpperCase() : 'SE'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">{ref.referred_name || 'Anonymous Member'}</h4>
                      <span className="text-[11px] text-zinc-400">
                        Joined {new Date(ref.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded tracking-wide ${
                        ref.status === 'completed'
                          ? 'bg-[#B8F500] text-[#0F172A]'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {ref.status === 'completed' ? 'Completed (₦50.00)' : 'Pending Task'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
