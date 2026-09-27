import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, ShieldCheck, AlertCircle, Sparkles, Clock, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { RewardOpportunity } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface RewardSessionModalProps {
  opportunity: RewardOpportunity | null;
  onClose: () => void;
  onRewardClaimed: () => void;
}

type StepState = 'preparing' | 'in_progress' | 'verifying' | 'rewarded' | 'error';

export const RewardSessionModal: React.FC<RewardSessionModalProps> = ({
  opportunity,
  onClose,
  onRewardClaimed,
}) => {
  const { refreshUserData } = useAuth();
  const [step, setStep] = useState<StepState>('preparing');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(15);
  const [claimedData, setClaimedData] = useState<{
    points: number;
    newBalance: number;
    txRef: string;
    providerTxId?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showExitWarning, setShowExitWarning] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const hasClaimedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!opportunity) return;
    hasClaimedRef.current = false;

    // Establish server-side reward session
    const initSession = async () => {
      try {
        setStep('preparing');
        setErrorMessage('');

        const res = await api.startRewardSession(opportunity.id);
        setSessionId(res.sessionId);
        setSessionToken(res.token);

        const duration = res.opportunity?.estimatedSeconds || opportunity.estimated_seconds || opportunity.estimated_duration || 15;
        setTotalSeconds(duration);
        setSecondsRemaining(duration);
        startTimeRef.current = Date.now();
        setStep('in_progress');
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to establish secure reward session.');
        setStep('error');
      }
    };

    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [opportunity]);

  const triggerClaim = () => {
    if (hasClaimedRef.current) return;
    hasClaimedRef.current = true;
    handleVerifyAndClaim();
  };

  // Timer countdown
  useEffect(() => {
    if (step === 'in_progress' && secondsRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (step === 'in_progress' && secondsRemaining === 0 && sessionId) {
      triggerClaim();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, secondsRemaining, sessionId]);

  const handleVerifyAndClaim = async () => {
    if (!opportunity) return;
    try {
      setStep('verifying');
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const rewardAmt = Number(opportunity.reward_amount || opportunity.reward_points || 10);

      const res = await api.verifyAndClaimReward(sessionId, {
        token: sessionToken,
        elapsedSeconds,
        opportunityId: opportunity.id,
        provider: opportunity.provider || 'SwiftEarnInternal',
        title: opportunity.title || opportunity.name,
        amount: rewardAmt,
      });

      if (res.success) {
        setClaimedData({
          points: res.pointsEarned || rewardAmt,
          newBalance: res.newBalance,
          txRef: res.transactionReference,
          providerTxId: res.providerTransactionId,
        });
        setStep('rewarded');
        await refreshUserData();
        onRewardClaimed();
      } else {
        setErrorMessage(res.message || 'Reward verification failed.');
        setStep('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server verification failed.');
      setStep('error');
    }
  };

  const handleAttemptClose = () => {
    if (step === 'in_progress' && secondsRemaining > 1) {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  if (!opportunity) return null;

  const progressPercent =
    totalSeconds > 0 ? Math.min(100, Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        id="reward-session-modal"
        className="bg-[#0F172A] text-white w-full max-w-md rounded-3xl shadow-2xl border border-zinc-800 flex flex-col max-h-[90vh] sm:max-h-[88vh] relative overflow-hidden my-auto"
      >
        {/* Top Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-[#B8F500] text-[#0F172A] font-black px-2 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              SWIFT EARN TASK
            </span>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8F500]" />
              Verified Protocol
            </span>
          </div>

          <button
            onClick={handleAttemptClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exit Warning Overlay */}
        {showExitWarning && (
          <div className="absolute inset-0 bg-[#0F172A]/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full bg-zinc-800 text-[#B8F500] flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Forfeit Reward?</h3>
            <p className="text-sm text-zinc-400 max-w-xs mb-6">
              You have {secondsRemaining} seconds remaining. Closing now will void your reward session and no points will be credited.
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#6C2BD9] text-white font-bold text-sm hover:bg-[#5821B0]"
              >
                Continue Earning
              </button>
              <button
                onClick={() => {
                  setShowExitWarning(false);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm hover:bg-zinc-700"
              >
                Quit Anyway
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {step === 'preparing' && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-[#6C2BD9] border-t-[#B8F500] animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-zinc-200">Initializing Task Session...</p>
              <p className="text-xs text-zinc-500">Establishing cryptographic session token and anti-cheat tracking</p>
            </div>
          )}

          {step === 'in_progress' && (
            <div className="space-y-4">
              <div className="relative bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 p-5 sm:p-6 flex flex-col items-center justify-center text-center group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6C2BD9]/20 via-transparent to-[#B8F500]/10 pointer-events-none"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center shadow-lg mb-2 sm:mb-3 shrink-0">
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-[#B8F500] ml-0.5" />
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white relative z-15 break-words px-4">
                  {opportunity.title || opportunity.name}
                </h4>
                <p className="text-[11px] sm:text-xs text-zinc-300 mt-1 max-w-xs relative z-15 leading-relaxed px-2">
                  {opportunity.description || 'Complete the interactive task to receive your verified reward.'}
                </p>

                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-zinc-700 text-xs font-mono font-bold text-[#B8F500] flex items-center gap-1.5 shadow-md z-20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{secondsRemaining}s</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
                <div className="flex justify-between text-xs text-zinc-400 font-medium">
                  <span>Task Progress</span>
                  <span className="text-[#B8F500] font-mono font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6C2BD9] to-[#B8F500] transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Guaranteed Reward:</span>
                <span className="font-black text-[#B8F500] text-sm sm:text-base">
                  +₦{(opportunity.reward_amount || opportunity.reward_points || 10).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full border-4 border-[#6C2BD9] border-t-[#B8F500] animate-spin mx-auto"></div>
              <div>
                <h4 className="text-base font-bold text-white">Verifying Task Completion</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Validating session token, verifying duration, and updating your wallet ledger.
                </p>
              </div>
            </div>
          )}

          {step === 'rewarded' && claimedData && (
            <div className="py-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-3xl bg-[#B8F500] text-[#0F172A] mx-auto flex items-center justify-center shadow-xl shadow-[#B8F500]/20">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8F500] block mb-1">
                  Reward Earned
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  +₦{claimedData.points.toFixed(2)}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  Added to your available NGN wallet balance!
                </p>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-3 sm:p-4 border border-zinc-800 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-400">Ledger Reference</span>
                  <span className="font-mono text-zinc-200 font-semibold">{claimedData.txRef}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Updated NGN Balance</span>
                  <span className="font-bold text-[#B8F500] text-sm">₦{claimedData.newBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[#B8F500] hover:bg-[#A3DC00] text-[#0F172A] font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue Earning</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Session Notice</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {errorMessage || 'Task session could not be completed. Please try again.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
