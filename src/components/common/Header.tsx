import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { user } = useAuth();

  const handleNav = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <header id="swift-earn-main-header" className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Left spacer for perfect centering */}
        <div className="w-14 sm:w-28 shrink-0"></div>

        {/* Brand Title: Boldly at the middle of the top */}
        <button
          id="brand-logo-btn"
          onClick={() => handleNav(user ? 'dashboard' : 'landing')}
          className="mx-auto text-center group cursor-pointer focus:outline-hidden"
          title="Swift Earn"
        >
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#6C2BD9] hover:opacity-90 transition-opacity">
            Swift Earn
          </span>
        </button>

        {/* Right actions: If visitor on landing, show direct Sign Up / Log In */}
        <div className="w-14 sm:w-28 shrink-0 flex items-center justify-end gap-1.5">
          {!user && currentTab === 'landing' && (
            <button
              id="header-nav-login-btn"
              onClick={() => handleNav('login')}
              className="px-3 py-1.5 rounded-lg bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
