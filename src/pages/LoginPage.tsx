import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, Mail, Lock } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    if (!password) {
      setError('Please provide your password.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
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
          Welcome Back
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sign in to your Swift Earn account to access your wallet
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-sm border border-zinc-200">
          {error && (
            <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-900">
              <AlertCircle className="w-4 h-4 text-[#6C2BD9] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Password
                </label>
                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs font-semibold text-[#6C2BD9] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-hidden focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 text-sm"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="w-4 h-4 text-[#B8F500]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch to sign up */}
          <div className="mt-6 text-center pt-4 border-t border-zinc-100">
            <span className="text-xs text-zinc-600">Don't have an account? </span>
            <button
              id="link-to-signup"
              onClick={() => onNavigate('signup')}
              className="text-xs font-bold text-[#6C2BD9] hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
