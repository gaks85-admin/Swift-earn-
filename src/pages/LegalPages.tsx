import React, { useState } from 'react';
import { ShieldCheck, FileText, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LegalPagesProps {
  initialTab?: 'terms' | 'privacy' | 'reward' | 'withdrawal';
}

export const LegalPages: React.FC<LegalPagesProps> = ({ initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'reward' | 'withdrawal'>(initialTab);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#6C2BD9]">
            Legal & Compliance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Policies & Agreements
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Official guidelines governing rewarded participation, data safety, and withdrawal processing on Swift Earn.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'terms'
                ? 'bg-[#6C2BD9] text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'privacy'
                ? 'bg-[#6C2BD9] text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('reward')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'reward'
                ? 'bg-[#6C2BD9] text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Reward & Ad Policy
          </button>
          <button
            onClick={() => setActiveTab('withdrawal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'withdrawal'
                ? 'bg-[#6C2BD9] text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Withdrawal Policy
          </button>
        </div>

        {/* Policy Content Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200 shadow-xs leading-relaxed text-zinc-700 text-sm space-y-6">
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-zinc-900">Terms of Service</h2>
              <p className="text-xs text-zinc-400">Last updated: September 2026</p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">1. Eligibility and Account Opening</h3>
              <p>
                By creating an account on <strong>Swift Earn</strong>, you confirm that you are at least 18 years of age or have legal parental consent to participate in rewarded digital advertising programs. Each natural person is strictly permitted a single Swift Earn account.
              </p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">2. Prohibited Conduct and Integrity</h3>
              <p>
                Users agree never to engage in artificial impression generation, bot traffic, automated scripting, proxy/VPN obfuscation, or simulated device tampering. Swift Earn utilizes cryptographic telemetry to verify that rewarded sessions represent genuine human engagement.
              </p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">3. Termination of Service</h3>
              <p>
                Any breach of partner ad network guidelines or attempt to bypass cryptographic session tokens will result in immediate forfeiture of unconfirmed balances and permanent suspension of the account.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-zinc-900">Privacy Policy</h2>
              <p className="text-xs text-zinc-400">Last updated: September 2026</p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">1. Information We Collect</h3>
              <p>
                We collect your name, email address, IP address for anti-fraud localization, and payout destination details (bank account number or fintech wallet identifier) solely for the purpose of executing confirmed reward disbursements.
              </p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">2. Zero Unauthorized Data Selling</h3>
              <p>
                Swift Earn does not sell, rent, or lease personal identifiers to external data brokers. Advertising providers receive non-identifiable telemetry to validate session completion according to GDPR and NDPR standards.
              </p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">3. Data Retention and Security</h3>
              <p>
                All account and ledger records are stored behind encrypted protocols with salted cryptographic hashing. You may request data deletion by contacting our privacy compliance desk.
              </p>
            </div>
          )}

          {activeTab === 'reward' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#6C2BD9]" />
                <h2 className="text-xl font-extrabold text-zinc-900">
                  Rewarded Advertising Compliance Policy
                </h2>
              </div>
              <p className="text-xs text-zinc-400">Standard Advertising Partner Guidelines</p>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs space-y-1.5 text-zinc-800">
                <span className="font-extrabold text-[#6C2BD9] block">Mandatory Partner Agreement:</span>
                <p>
                  Swift Earn strictly integrates only with advertising networks and supply partners that explicitly endorse incentivized/rewarded advertising. We operate under zero-tolerance rules for fraudulent impressions.
                </p>
              </div>

              <h3 className="text-base font-bold text-zinc-900 pt-2">Zero-Tolerance Violations</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li>Fake ad impressions or simulated views</li>
                <li>Auto-clickers, macro recorders, or background iframe stacking</li>
                <li>Encouraging users to click ads under false pretenses</li>
                <li>Skipping or aborting video streams prior to completion countdown</li>
                <li>Tampering with client-side verification tokens</li>
              </ul>

              <h3 className="text-base font-bold text-zinc-900 pt-2">How Server-Side Verification Operates</h3>
              <p className="text-xs leading-relaxed">
                When a session begins, a signed cryptographic nonce is generated by the Swift Earn backend. Upon provider completion, the token is signed and returned. Rewards are only logged to the ledger if the server validates matching timing and authentic cryptographic signature.
              </p>
            </div>
          )}

          {activeTab === 'withdrawal' && (
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-zinc-900">Withdrawal & Settlement Policy</h2>
              <p className="text-xs text-zinc-400">Financial Processing Rules</p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">1. Minimum Withdrawal Threshold</h3>
              <p>
                To maintain cost-effective settlement for users and banking gateways, the minimum eligible withdrawal amount is <strong>₦500.00</strong>.
              </p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">2. Single Active Request Queue</h3>
              <p>
                To prevent race conditions and duplicate debits, users may maintain at most one (1) active withdrawal request in pending or processing status at any given time.
              </p>

              <h3 className="text-base font-bold text-zinc-900 pt-2">3. Verification & Settlement Timelines</h3>
              <p>
                Standard bank transfers and fintech wallet credits undergo automated anti-fraud validation. Approved requests are settled via verified payment partner gateways. No payment is marked completed without definitive confirmation from the payout provider.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
