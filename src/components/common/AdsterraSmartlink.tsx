import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

/**
 * Adsterra Smartlink / Direct Link Component
 *
 * SPECIFICATION & CONSTRAINTS:
 * 1. Direct URL:
 *    https://www.profitableratecpmnetwork.com/v9yct13v3?key=a36dee174369e6cc18c4e982d4bd79d7
 * 2. Dedicated Monetization Element:
 *    - NOT placed on navigation, login, signup, withdraw, profile, or core actions.
 *    - NOT disguised as a system control.
 *    - Normal standard anchor: target="_blank", rel="noopener noreferrer".
 * 3. User-Initiated Interaction Only:
 *    - Activates solely on deliberate, intentional user click.
 *    - No automatic redirect, no script injection, no window.open on mount/load/route.
 * 4. Pure Monetization Layer:
 *    - NEVER credits user wallets, available_balance, pending_rewards, or total_earned.
 *    - Produces ₦0 reward.
 *    - Clearly labeled with "ADVERTISEMENT" and "Sponsored advertising. Opening this offer does not generate wallet rewards."
 */
export const AdsterraSmartlink: React.FC = () => {
  const SMARTLINK_URL = 'https://www.profitableratecpmnetwork.com/v9yct13v3?key=a36dee174369e6cc18c4e982d4bd79d7';

  return (
    <section aria-label="Sponsored Advertisement (Smartlink)" className="w-full flex justify-center my-4 overflow-hidden">
      <div className="w-full max-w-3xl bg-white rounded-3xl px-4 py-5 sm:p-6 border border-zinc-200/80 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">Verified Partner Link</span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            Direct Offer
          </span>
        </div>

        {/* Smartlink Content Card */}
        <div className="w-full bg-gradient-to-r from-purple-50/70 via-slate-50 to-emerald-50/50 rounded-2xl p-5 border border-purple-100/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 bg-[#6C2BD9]/10 text-[#6C2BD9] text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Sponsored Offer</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
              Explore External Partner Destinations
            </h3>
            <p className="text-xs text-zinc-500 max-w-lg leading-relaxed">
              Browse curated web campaigns, sponsored services, and special partner destinations directly from our monetization network.
            </p>
          </div>

          <a
            href={SMARTLINK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-[#6C2BD9] hover:bg-[#5821b5] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Open Sponsored Offer</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Mandatory Disclosure */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Sponsored advertising. Opening this offer does not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
