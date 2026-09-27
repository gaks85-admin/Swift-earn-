import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { NotificationModal } from './components/common/NotificationModal';
import { RewardSessionModal } from './components/rewards/RewardSessionModal';

import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/SignUpPage';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { EarnPage } from './pages/EarnPage';
import { WalletPage } from './pages/WalletPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { ProfilePage } from './pages/ProfilePage';
import { HelpCenterPage } from './pages/HelpCenterPage';
import { LegalPages } from './pages/LegalPages';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { RewardOpportunity } from './types';

const MainAppContent: React.FC = () => {
  const { user, isLoading, isPasswordRecovery } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [initialRefCode, setInitialRefCode] = useState<string>('');
  const [activeRewardOpportunity, setActiveRewardOpportunity] = useState<RewardOpportunity | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Check URL query parameters for referral links on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('swift_ref_code', ref);
      setInitialRefCode(ref);
      if (!user) {
        setCurrentTab('signup');
      }
    } else {
      const storedRef = localStorage.getItem('swift_ref_code');
      if (storedRef) {
        setInitialRefCode(storedRef);
      }
    }
  }, [user]);

  // If Supabase sends recovery event or URL has recovery tokens, show password reset page
  useEffect(() => {
    if (isPasswordRecovery) {
      setCurrentTab('reset-password');
    }
  }, [isPasswordRecovery]);

  // Protected Pages: If user is not logged in and tries to access protected pages, redirect to Login
  useEffect(() => {
    if (!isLoading && !user) {
      const protectedTabs = ['dashboard', 'earn', 'wallet', 'withdraw', 'referrals', 'profile'];
      if (protectedTabs.includes(currentTab)) {
        setCurrentTab('login');
      }
    }
  }, [user, isLoading, currentTab]);

  // If a logged-in user visits Login or Sign Up, redirect them to the dashboard
  useEffect(() => {
    if (!isLoading && user && !isPasswordRecovery) {
      if (currentTab === 'login' || currentTab === 'signup') {
        setCurrentTab('dashboard');
      }
    }
  }, [user, isLoading, currentTab, isPasswordRecovery]);

  // Handle navigation
  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [earnRefreshKey, setEarnRefreshKey] = useState<number>(0);

  const handleStartReward = (opportunity: RewardOpportunity) => {
    if (!user) {
      setCurrentTab('login');
      return;
    }
    setActiveRewardOpportunity(opportunity);
  };

  const handleRewardClaimed = () => {
    setEarnRefreshKey((prev) => prev + 1);
  };

  // Render current view
  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'landing':
        return (
          <LandingPage
            onStartEarning={() => handleNavigate(user ? 'dashboard' : 'signup')}
            onNavigate={handleNavigate}
          />
        );
      case 'signup':
        return <SignUpPage onNavigate={handleNavigate} initialReferralCode={initialRefCode} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ResetPasswordPage mode="request" onNavigate={handleNavigate} />;
      case 'reset-password':
        return <ResetPasswordPage mode="update" onNavigate={handleNavigate} />;
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onStartRewardOpportunity={handleStartReward}
          />
        );
      case 'earn':
        return (
          <EarnPage
            key={earnRefreshKey}
            onRefreshWallet={() => setEarnRefreshKey((prev) => prev + 1)}
            onNavigate={handleNavigate}
            onStartRewardOpportunity={handleStartReward}
          />
        );
      case 'wallet':
        return <WalletPage onNavigate={handleNavigate} />;
      case 'withdraw':
        return <WithdrawPage onNavigate={handleNavigate} />;
      case 'referrals':
        return <ReferralsPage onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfilePage onNavigate={handleNavigate} />;
      case 'help':
        return <HelpCenterPage />;
      case 'legal-terms':
        return <LegalPages initialTab="terms" />;
      case 'legal-privacy':
        return <LegalPages initialTab="privacy" />;
      case 'legal-reward':
        return <LegalPages initialTab="reward" />;
      case 'legal-withdrawal':
        return <LegalPages initialTab="withdrawal" />;
      case 'admin':
        return <AdminDashboardPage onNavigate={handleNavigate} />;
      default:
        return (
          <LandingPage
            onStartEarning={() => handleNavigate(user ? 'dashboard' : 'signup')}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  // Determine if bottom navigation should be shown (only when user is logged in on in-app pages)
  const showBottomNav =
    Boolean(user) &&
    currentTab !== 'admin' &&
    currentTab !== 'landing' &&
    currentTab !== 'signup' &&
    currentTab !== 'login' &&
    currentTab !== 'forgot-password' &&
    currentTab !== 'reset-password' &&
    !currentTab.startsWith('legal-') &&
    currentTab !== 'help';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-[#B8F500] selection:text-[#0F172A]">
      {/* 1. Top Header with centered Swift Earn */}
      {currentTab !== 'admin' && (
        <Header
          currentTab={currentTab}
          setCurrentTab={handleNavigate}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />
      )}

      {/* 2. Main Page Content */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* 3. Bottom Navigation Bar: Only visible to authenticated users inside the app */}
      {showBottomNav && (
        <BottomNav currentTab={currentTab} setCurrentTab={handleNavigate} />
      )}

      {/* 4. Notifications Slide-over/Modal */}
      <NotificationModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigate={(tab) => {
          setNotificationsOpen(false);
          handleNavigate(tab);
        }}
      />

      {/* 5. Reward Session Modal */}
      {activeRewardOpportunity && (
        <RewardSessionModal
          opportunity={activeRewardOpportunity}
          onClose={() => setActiveRewardOpportunity(null)}
          onRewardClaimed={handleRewardClaimed}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
