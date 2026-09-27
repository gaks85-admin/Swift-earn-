import React from 'react';
import { Home, Sparkles, Wallet, Users, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { user } = useAuth();

  const navItems = [
    { id: user ? 'dashboard' : 'landing', label: 'Home', icon: Home },
    { id: 'earn', label: 'Earn', icon: Sparkles, badge: true },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: user ? 'profile' : 'login', label: 'Profile', icon: User },
  ];

  return (
    <nav
      id="swift-earn-bottom-nav"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-lg px-4 py-1.5"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id ||
            (item.id === 'dashboard' && currentTab === 'landing') ||
            (item.id === 'profile' && currentTab === 'login');

          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#6C2BD9] font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#B8F500] ring-2 ring-white"></span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight leading-tight">
                {item.label}
              </span>
              {isActive && (
                <div className="w-4 h-1 bg-[#6C2BD9] rounded-full mt-0.5"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
