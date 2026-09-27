import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SignUpPageProps {
  onNavigate: (tab: string) => void;
  initialReferralCode?: string;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, initialReferralCode = '' }) => {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(
    initialReferralCode || localStorage.getItem('swift_ref_code') || ''
  );

  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
    } else {
      const stored = localStorage.getItem('swift_ref_code');
      if (stored) {
        setReferralCode(stored);
      }
    }
  }, [initialReferralCode]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms and Conditions and Privacy Policy.');
      return;
    }

    try {
      setLoading(true);
      const res = await signup({
        fullName,
        email,
        password,
        confirmPassword,
        referralCode: referralCode.trim() || undefined,
        agreeTerms,
      });

      if (res?.requiresEmailConfirmation) {
        setSuccessNotice('Account created successfully! We sent a confirmation link to your email. Please verify your email before logging in.');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <button
          onClick={() => onNavigate('landing')}
          className="text-xs font-bold text-zinc-500 hover:text-[#6C2BD9] mb-4 inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          ← Back to Home
        </button>

        {/* Brand Display */}
        <span className="text-3xl font-extrabold text-[#6C2BD9] tracking-tight block">
          Swift Earn
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-zinc-900 tracking-tight">
          Create Your Swift Earn Account
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Start earning confirmed rewards from legitimate advertising partners
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-sm border border-zinc-200">
          {error && (
            <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-900">
              <AlertCircle className="w-4 h-4 text-[#6C2BD9] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{successNotice}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="mt-2 text-xs font-bold text-[#6C2BD9] underline block"
                >
                  Proceed to Log In →
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Full Name
              </label>
              <input
                id="signup-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 chars"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1 flex items-center justify-between">
                <span>Referral Code</span>
                <span className="text-zinc-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="signup-referral-code"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. SE-DEMO1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm font-mono uppercase"
              />
            </div>

            {/* Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  id="signup-agree-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#6C2BD9] border-zinc-300 focus:ring-[#6C2BD9]"
                />
                <span className="text-xs text-zinc-600 leading-normal">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('legal-terms')}
                    className="text-[#6C2BD9] font-bold hover:underline cursor-pointer"
                  >
                    Terms and Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('legal-privacy')}
                    className="text-[#6C2BD9] font-bold hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                id="btn-create-account"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4 text-[#B8F500]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch to login */}
          <div className="mt-6 text-center pt-5 border-t border-zinc-100">
            <span className="text-xs text-zinc-600">Already have an account? </span>
            <button
              id="link-to-login"
              onClick={() => onNavigate('login')}
              className="text-xs font-bold text-[#6C2BD9] hover:underline cursor-pointer"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
