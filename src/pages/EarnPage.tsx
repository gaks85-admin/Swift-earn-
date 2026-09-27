import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { RewardOpportunity } from '../types';
import { EarnHeader } from '../components/earn/EarnHeader';
import { RewardOpportunityList } from '../components/earn/RewardOpportunityList';
import { SponsoredContent } from '../components/earn/SponsoredContent';
import { EarnSecurityNotice } from '../components/earn/EarnSecurityNotice';

interface EarnPageProps {
  onRefreshWallet?: () => void;
  onNavigate?: (tab: string) => void;
  onStartRewardOpportunity?: (opportunity: RewardOpportunity) => void;
}

export const EarnPage: React.FC<EarnPageProps> = ({
  onRefreshWallet,
  onStartRewardOpportunity,
}) => {
  const { wallet, refreshUserData } = useAuth();
  const [opportunities, setOpportunities] = useState<RewardOpportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOpportunities = async () => {
    try {
      setError(null);
      const res = await api.getOpportunities();
      setOpportunities(res.opportunities || []);
    } catch (err: any) {
      console.warn('Notice: Error loading opportunities in EarnPage:', err);
      setError(err?.message || 'Unable to load opportunities at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshUserData(), loadOpportunities()]);
      if (onRefreshWallet) onRefreshWallet();
    } catch {
      // Handled internally by loadOpportunities and refreshUserData
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const handleStart = (opportunity: RewardOpportunity) => {
    if (onStartRewardOpportunity) {
      onStartRewardOpportunity(opportunity);
    }
  };

  return (
    <main
      id="swift-earn-earn-page"
      className="bg-[#F8FAFC] min-h-screen pb-28 md:pb-16 pt-5 sm:pt-7 overflow-x-hidden"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* 1. Header: Clean title, subtitle, balance, and refresh */}
        <EarnHeader
          wallet={wallet}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />

        {/* 2. Available Earning Opportunities (Priority 1) */}
        <RewardOpportunityList
          opportunities={opportunities}
          loading={loading}
          error={error}
          onRetry={loadOpportunities}
          onStart={handleStart}
        />

        {/* 3. Sponsored Content Area (Visually separated, no provider branding) */}
        <SponsoredContent />

        {/* 4. Security & Trust Information */}
        <EarnSecurityNotice />
      </div>
    </main>
  );
};
