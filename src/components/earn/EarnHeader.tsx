import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Wallet } from '../../types';

interface EarnHeaderProps {
  wallet: Wallet | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export const EarnHeader: React.FC<EarnHeaderProps> = ({
  wallet,
  refreshing,
  onRefresh,
}) => {
  return (
    <header className="bg-gradient-to-br from-[#0F172A] via-zinc-900 to-[#0F172A] rounded-3xl p-5 sm:p-7 border border-zinc-800 text-white shadow-xl relative overflow-hidden">
      {/* Decorative ambient glows */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-[#6C2BD9]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-40 h-40 bg-[#B8F500]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top bar with badge and refresh button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 bg-[#B8F500] text-[#0F172A] text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 fill-[#0F172A]" />
            <span>Available opportunities</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh wallet balance and opportunities"
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Title and professional subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Earn Rewards
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl leading-relaxed">
            Complete available opportunities and grow your Swift Earn balance.
          </p>
        </div>

        {/* Authoritative Wallet Balance Pill */}
        {wallet && (
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <div className="bg-zinc-800/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-zinc-700/60 flex items-center gap-2">
              <span className="text-zinc-400 text-xs">Available Balance:</span>
              <span className="font-extrabold text-[#B8F500] text-sm sm:text-base">
                ₦{wallet.available_balance.toFixed(2)}
              </span>
            </div>
            <div className="bg-zinc-800/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-zinc-700/60 flex items-center gap-2">
              <span className="text-zinc-400 text-xs">Total Earned:</span>
              <span className="font-extrabold text-white text-sm sm:text-base">
                ₦{wallet.total_earned.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
