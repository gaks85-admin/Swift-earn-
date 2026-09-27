import React from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  return (
    <footer id="swift-earn-footer" className="bg-[#0F172A] text-zinc-300 border-t border-zinc-800 pt-12 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="md:col-span-2 space-y-4">
            <span className="text-2xl font-extrabold text-[#B8F500] tracking-tight block">
              Swift Earn
            </span>
            <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
              Swift Earn is a legitimate rewards platform where users complete eligible rewarded
              advertising opportunities and receive verified rewards directly into their confirmed wallet.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-[#B8F500]" />
                <span>Verified Ad Verification</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-200">
                <Lock className="w-4 h-4 text-[#B8F500]" />
                <span>Immutable Ledger</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation & Discover */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => setCurrentTab('landing')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('landing');
                    setTimeout(() => {
                      document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('earn')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Earn Rewards
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('help')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  FAQ & Help Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('help')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Compliance & Legal */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Legal & Policies</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => setCurrentTab('legal-terms')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('legal-privacy')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('legal-reward')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Reward Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('legal-withdrawal')}
                  className="text-zinc-400 hover:text-[#B8F500] transition-colors"
                >
                  Withdrawal Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('admin')}
                  className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                >
                  Admin Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} <strong className="text-zinc-300">Swift Earn</strong>. All rights reserved.
          </div>
          <div className="text-center sm:text-right text-[11px] text-zinc-400">
            Compliant rewarded advertising ecosystem. Legitimate opportunities verified with partner networks.
          </div>
        </div>
      </div>
    </footer>
  );
};
