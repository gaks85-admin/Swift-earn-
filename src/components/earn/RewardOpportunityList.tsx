import React from 'react';
import { RewardOpportunity } from '../../types';
import { RewardOpportunityCard } from './RewardOpportunityCard';
import { RewardedVideoCard } from './RewardedVideoCard';
import { EarnEmptyState } from './EarnEmptyState';
import { EarnLoadingState } from './EarnLoadingState';
import { EarnErrorState } from './EarnErrorState';

interface RewardOpportunityListProps {
  opportunities: RewardOpportunity[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onStart: (opportunity: RewardOpportunity) => void;
}

export const RewardOpportunityList: React.FC<RewardOpportunityListProps> = ({
  opportunities,
  loading,
  error,
  onRetry,
  onStart,
}) => {
  return (
    <section aria-labelledby="earn-opportunities-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="earn-opportunities-heading"
            className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight"
          >
            Earn Opportunities
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Verified tasks and partner opportunities with guaranteed server validation
          </p>
        </div>
      </div>

      {loading && <EarnLoadingState />}

      {!loading && error && <EarnErrorState message={error} onRetry={onRetry} />}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <RewardedVideoCard />
          <RewardedVideoCard />
          <RewardedVideoCard />
          <RewardedVideoCard />
        </div>
      )}
    </section>
  );
};
