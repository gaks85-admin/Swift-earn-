import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { AdsterraBanner } from '../common/AdsterraBanner';
import { AdsterraBanner160x300 } from '../common/AdsterraBanner160x300';
import { AdsterraNativeBanner } from '../common/AdsterraNativeBanner';
import { AdsterraSocialBar } from '../common/AdsterraSocialBar';
import { AdsterraPopunder } from '../common/AdsterraPopunder';
import { AdcashAutotag } from '../common/AdcashAutotag';


/**
 * SponsoredContent Component
 *
 * Visual presentation for Swift Earn's sponsored advertising layer.
 * Rules:
 * - Visibly separated section below earning opportunities.
 * - Header: "Sponsored Content", Subtitle: "Sponsored content helps support Swift Earn."
 * - Completely free of provider names (Adsterra, ad network codes, etc.).
 * - On Mobile: cleanly displays primary advertising with generous spacing without horizontal overflow.
 * - On Desktop: balanced column layout that does not overwhelm earning opportunities.
 * - Separates sponsored offers clearly from verified earning tasks.
 */
export const SponsoredContent: React.FC = () => {
  const SMARTLINK_URL =
    'https://www.profitableratecpmnetwork.com/v9yct13v3?key=a36dee174369e6cc18c4e982d4bd79d7';

  return (
    <section aria-labelledby="sponsored-content-heading" className="space-y-6 pt-4 border-t border-zinc-200">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <h2
            id="sponsored-content-heading"
            className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight"
          >
            Sponsored Content
          </h2>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Sponsored content helps support Swift Earn.
        </p>
      </div>

      {/* Primary Display Banners (Cleanly adapted for mobile vs desktop) */}
      <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-6 my-2">
        <div className="w-full md:w-auto flex justify-center">
          <AdsterraBanner />
        </div>
        <div className="w-full md:w-auto flex justify-center">
          <AdsterraBanner160x300 />
        </div>
      </div>

      {/* Fluid Responsive Native Unit */}
      <div className="w-full flex justify-center">
        <AdsterraNativeBanner />
      </div>

      {/* Sponsored Partner Offer (Clean Smartlink Presentation) */}
      <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">Sponsored Partner</span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            Partner Offer
          </span>
        </div>

        {/* Offer card */}
        <div className="w-full bg-gradient-to-r from-purple-50/70 via-slate-50 to-emerald-50/50 rounded-2xl p-5 border border-purple-100/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 bg-[#6C2BD9]/10 text-[#6C2BD9] text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Sponsored Offer</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
              Explore a sponsored offer
            </h3>
            <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
              Explore external partner web destinations curated by our sponsorship network.
            </p>
          </div>

          <a
            href={SMARTLINK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-[#6C2BD9] hover:bg-[#5821b5] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <span>Open Offer</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Footer disclosure */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Sponsored advertising. Opening this offer does not generate wallet rewards.
          </p>
        </div>
      </div>

      {/* Interactive Overlay & On-Click Units in Isolated Sandboxes */}
      <div className="w-full flex justify-center">
        <AdsterraSocialBar />
      </div>

      <div className="w-full flex justify-center">
        <AdsterraPopunder />
      </div>

      {/* Automated Monetization Tag Zone (Direct Global Loader) */}
      <div className="w-full flex justify-center">
        <AdcashAutotag />
      </div>
    </section>
  );
};
