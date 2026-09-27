import React from 'react';
import { ArrowRight, Play, Wallet, Users, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onStartEarning: () => void;
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartEarning, onNavigate }) => {
  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] flex flex-col justify-between text-[#0F172A]">
      {/* 1. Hero Presentation */}
      <section id="landing-hero" className="pt-8 pb-12 sm:pt-14 sm:pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#6C2BD9]">
            <Sparkles className="w-3.5 h-3.5 text-[#6C2BD9]" />
            <span>Watch Ads • Earn Points • Instant Bank Cashout</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-zinc-900 leading-tight">
            Turn Your Free Time Into <span className="text-[#6C2BD9]">Real Rewards</span>
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base md:text-lg text-zinc-600 max-w-xl mx-auto leading-relaxed">
            Watch short video ads, claim verified reward points, and withdraw cash directly to your bank account or fintech wallet.
          </p>

          {/* Action Buttons: Sign Up & Log In */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              id="landing-btn-signup"
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-black text-base shadow-lg shadow-purple-900/15 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 text-[#B8F500] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              id="landing-btn-login"
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-extrabold text-base shadow-xs transition-colors cursor-pointer"
            >
              Log In to Account
            </button>
          </div>
        </div>
      </section>

      {/* 2. 3 Simple Steps */}
      <section id="landing-how-it-works" className="py-8 px-4 bg-white border-y border-zinc-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              How Swift Earn Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Start earning real rewards in three easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-zinc-200 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center font-black text-lg mb-3 shadow-xs">
                1
              </div>
              <h3 className="text-sm font-black text-zinc-900">Create Free Account</h3>
              <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                Sign up in under 30 seconds with your email to unlock your verified personal wallet.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-zinc-200 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#B8F500]/40 text-[#0F172A] flex items-center justify-center font-black text-lg mb-3 shadow-xs">
                <Play className="w-5 h-5 fill-current text-[#0F172A]" />
              </div>
              <h3 className="text-sm font-black text-zinc-900">Watch Video Ads</h3>
              <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                Watch short 15–30 second brand videos and get confirmed points credited instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-zinc-200 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-[#6C2BD9] flex items-center justify-center font-black text-lg mb-3 shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-900">Instant Cashout</h3>
              <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                Request withdrawals directly into your bank account as soon as your balance reaches ₦500.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Highlights */}
      <section id="landing-highlights" className="py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-[#6C2BD9] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wide">100% Free to Join</h4>
              <p className="text-xs text-zinc-500 mt-0.5">No subscription or deposit needed. Ever.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-[#6C2BD9] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wide">Verified Settlement</h4>
              <p className="text-xs text-zinc-500 mt-0.5">Automated ledger ensures all points are tracked.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <Users className="w-5 h-5 text-[#6C2BD9] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wide">₦50 Referral Bonus</h4>
              <p className="text-xs text-zinc-500 mt-0.5">Earn bonus reward points for every friend invited.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom Call To Action */}
      <section id="landing-bottom-cta" className="py-8 px-4 text-center">
        <div className="max-w-xl mx-auto space-y-3">
          <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900">
            Ready to start earning today?
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="bottom-cta-signup-btn"
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              Create Free Account
            </button>
            <button
              id="bottom-cta-login-btn"
              onClick={() => onNavigate('login')}
              className="text-xs font-bold text-zinc-600 hover:text-[#6C2BD9] transition-colors cursor-pointer"
            >
              Already have an account? <span className="text-[#6C2BD9] underline">Log In</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
