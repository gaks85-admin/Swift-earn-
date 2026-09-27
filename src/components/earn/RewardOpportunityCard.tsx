import React from 'react';
import { Play, FileText, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { RewardOpportunity } from '../../types';

interface RewardOpportunityCardProps {
  opportunity: RewardOpportunity;
  onStart: (opportunity: RewardOpportunity) => void;
}

export const RewardOpportunityCard: React.FC<RewardOpportunityCardProps> = ({
  opportunity,
  onStart,
}) => {
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'video':
        return <Play className="w-4 h-4 fill-current" />;
      case 'survey':
        return <FileText className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const durationSec =
    opportunity.estimated_seconds || opportunity.estimated_duration || 30;
  const durationLabel =
    durationSec >= 60 ? `~${Math.round(durationSec / 60)} min` : `~${durationSec} sec`;

  const rewardAmount =
    opportunity.reward_points ?? opportunity.reward_amount ?? 10;

  return (
    <article className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-xs hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between group">
      <div className="space-y-3">
        {/* Header row: Icon badge and reward badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            {getCategoryIcon(opportunity.category)}
          </div>
          <div className="inline-flex items-center gap-1 bg-[#6C2BD9]/10 text-[#6C2BD9] font-black text-xs sm:text-sm px-3 py-1 rounded-full border border-[#6C2BD9]/20">
            <span>+₦{rewardAmount}</span>
          </div>
        </div>

        {/* Title and description */}
        <div>
          <h3 className="text-base font-extrabold text-zinc-900 group-hover:text-[#6C2BD9] transition-colors leading-snug">
            {opportunity.title || opportunity.name}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">
            {opportunity.description}
          </p>
        </div>
      </div>

      {/* Footer row: duration and Start button */}
      <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{durationLabel}</span>
        </div>

        <button
          onClick={() => onStart(opportunity)}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
        >
          <span>Start</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
};
