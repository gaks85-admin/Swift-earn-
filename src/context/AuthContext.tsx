import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Profile, Wallet } from '../types';
import { api, getToken, setToken, removeToken, getAdminToken, setAdminToken, removeAdminToken } from '../api';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  formatSupabaseUser,
  fetchSupabaseProfileAndWallet,
  setCustomSupabaseConfig,
  getSupabaseConfig,
  formatSupabaseAuthError,
} from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  wallet: Wallet | null;
  unreadCount: number;
  admin: any | null;
  isLoading: boolean;
  isSupabase: boolean;
  supabaseConfig: { url: string; anonKey: string };
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  updateSupabaseConfig: (url: string, key: string) => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (payload: any) => Promise<{ requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  adminLogin: (email: string, pass: string) => Promise<void>;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [admin, setAdmin] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabase, setIsSupabase] = useState<boolean>(isSupabaseConfigured());
  const [supabaseConfig, setSupabaseConfigState] = useState(getSupabaseConfig());
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const updateSupabaseConfig = (url: string, key: string) => {
    setCustomSupabaseConfig(url, key);
    const configured = isSupabaseConfigured();
    setIsSupabase(configured);
    setSupabaseConfigState(getSupabaseConfig());
    if (configured) {
      refreshUserData();
    }
  };

  const refreshUserData = async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (!sb) return;
      try {
        const { data: sessionData } = await sb.auth.getSession();
        if (sessionData?.session?.user) {
          const sbUser = sessionData.session.user;
          const sbData = await fetchSupabaseProfileAndWallet(sbUser.id, sbUser);
          setUser(formatSupabaseUser(sbUser, sbData.profile));
          setProfile(sbData.profile);
          setWallet(sbData.wallet);
        } else {
          setUser(null);
          setProfile(null);
          setWallet(null);
        }
      } catch (err) {
        console.error('Error refreshing Supabase user data:', err);
      }
      return;
    }

    const token = getToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setWallet(null);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
      setProfile(data.profile);
      setWallet(data.wallet);
      setUnreadCount(data.unreadNotificationsCount || 0);
    } catch {
      removeToken();
      setUser(null);
      setProfile(null);
      setWallet(null);
    }
  };

  const refreshAdminData = async () => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      setAdmin(null);
      return;
    }
    try {
      const data = await api.getAdminMe();
      setAdmin(data.admin);
    } catch {
      removeAdminToken();
      setAdmin(null);
    }
  };

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      setIsLoading(true);

      // Check URL parameters for password recovery callback
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);

      if (
        hashParams.get('type') === 'recovery' ||
        queryParams.get('type') === 'recovery' ||
        window.location.hash.includes('type=recovery')
      ) {
        setIsPasswordRecovery(true);
      }

      if (isSupabaseConfigured()) {
        const sb = getSupabaseClient();
        if (sb) {
          try {
            // Restore persistent Supabase session on initial page load / refresh
            const { data: sessionData } = await sb.auth.getSession();
            if (sessionData?.session?.user) {
              const sbUser = sessionData.session.user;
              const sbData = await fetchSupabaseProfileAndWallet(sbUser.id, sbUser);
              setUser(formatSupabaseUser(sbUser, sbData.profile));
              setProfile(sbData.profile);
              setWallet(sbData.wallet);
              const userEmail = (sbUser.email || '').toLowerCase().trim();
              const isAuthorizedAdmin = userEmail === 'tonyanderson19880@gmail.com' || (sbData.profile && ['admin', 'super_admin'].includes(sbData.profile.role));
              if (isAuthorizedAdmin) {
                setAdmin({
                  id: sbUser.id,
                  email: sbUser.email,
                  full_name: sbData.profile?.full_name || 'Administrator',
                  role: userEmail === 'tonyanderson19880@gmail.com' ? 'super_admin' : sbData.profile?.role,
                });
              }
            }
          } catch (err) {
            console.error('Failed to restore Supabase session on startup:', err);
          }

          // Realtime auth state listener: login, logout, token refresh, password recovery
          const { data: listener } = sb.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              setIsPasswordRecovery(true);
            }

            if (session?.user) {
              const sbData = await fetchSupabaseProfileAndWallet(session.user.id, session.user);
              setUser(formatSupabaseUser(session.user, sbData.profile));
              setProfile(sbData.profile);
              setWallet(sbData.wallet);
              const userEmail = (session.user.email || '').toLowerCase().trim();
              const isAuthorizedAdmin = userEmail === 'tonyanderson19880@gmail.com' || (sbData.profile && ['admin', 'super_admin'].includes(sbData.profile.role));
              if (isAuthorizedAdmin) {
                setAdmin({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: sbData.profile?.full_name || 'Administrator',
                  role: userEmail === 'tonyanderson19880@gmail.com' ? 'super_admin' : sbData.profile?.role,
                });
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setProfile(null);
              setWallet(null);
              setAdmin(null);
            }
          });
          authSubscription = listener.subscription;
        }
      } else {
        await Promise.all([refreshUserData(), refreshAdminData()]);
      }

      setIsLoading(false);
    };

    init();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [isSupabase]);

  /**
   * 1. Supabase Log in with email and password
   */
  const login = async (email: string, pass: string) => {
    if (!isSupabaseConfigured()) {
      // Check if running on local development server with Express backend
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const data = await api.login({ email, password: pass });
          setToken(data.token);
          setUser(data.user);
          setProfile(data.profile);
          setWallet(data.wallet);
          await refreshUserData();
          return;
        } catch (err: any) {
          throw new Error(err.message || 'Login failed. Please check your credentials.');
        }
      }

      throw new Error(
        'Supabase is not configured on your deployment. Please add NEXT_SUPABASE_URL and NEXT_SUPABASE_ANON_KEY to your Vercel Environment Variables and redeploy.'
      );
    }

    const sb = getSupabaseClient();
    if (!sb) {
      throw new Error('Supabase client failed to initialize. Please check your URL and anon key.');
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }

    if (data?.user) {
      const sbData = await fetchSupabaseProfileAndWallet(data.user.id, data.user);
      setUser(formatSupabaseUser(data.user, sbData.profile));
      setProfile(sbData.profile);
      setWallet(sbData.wallet);
    }
  };

  /**
   * 2. Supabase Sign up with email, password, and metadata
   */
  const signup = async (payload: any) => {
    if (!isSupabaseConfigured()) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const data = await api.signup(payload);
        setToken(data.token);
        setUser(data.user);
        setProfile(data.profile);
        setWallet(data.wallet);
        return { requiresEmailConfirmation: false };
      }

      throw new Error(
        'Supabase is not configured on your deployment. Please add NEXT_SUPABASE_URL and NEXT_SUPABASE_ANON_KEY to your Vercel Environment Variables and redeploy.'
      );
    }

    const sb = getSupabaseClient();
    if (!sb) {
      throw new Error('Supabase client failed to initialize.');
    }

    const { data, error } = await sb.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName.trim(),
          referred_by: payload.referralCode?.trim().toUpperCase() || null,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }

    if (data?.user) {
      if (data.session) {
        // Direct auto-confirm (email confirmations disabled or confirmed)
        const sbData = await fetchSupabaseProfileAndWallet(data.user.id, data.user);
        setUser(formatSupabaseUser(data.user, sbData.profile));
        setProfile(sbData.profile);
        setWallet(sbData.wallet);
        return { requiresEmailConfirmation: false };
      } else {
        // Email confirmation is required by Supabase Auth settings
        return { requiresEmailConfirmation: true };
      }
    }
    return { requiresEmailConfirmation: false };
  };

  /**
   * 3. Supabase Sign out
   */
  const logout = async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (sb) {
        try {
          await sb.auth.signOut();
        } catch (err) {
          console.warn('Notice signing out from Supabase:', err);
        }
      }
    }
    removeToken();
    setUser(null);
    setProfile(null);
    setWallet(null);
    setUnreadCount(0);
    setIsPasswordRecovery(false);
  };

  /**
   * 4. Request password reset email via Supabase Auth
   */
  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase is not configured. Please add NEXT_SUPABASE_URL and NEXT_SUPABASE_ANON_KEY to your Vercel Environment Variables to enable password reset emails.'
      );
    }

    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase client is not available.');

    const redirectTo = `${window.location.origin}/?type=recovery`;

    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }
  };

  /**
   * 5. Set new password during recovery via Supabase Auth
   */
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase client is not available.');

    const { error } = await sb.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }
    setIsPasswordRecovery(false);
  };

  const adminLogin = async (email: string, pass: string) => {
    const data = await api.adminLogin({ email, password: pass });
    setAdminToken(data.token);
    setAdmin(data.admin);
  };

  const adminLogout = () => {
    removeAdminToken();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        unreadCount,
        admin,
        isLoading,
        isSupabase,
        supabaseConfig,
        isPasswordRecovery,
        setIsPasswordRecovery,
        updateSupabaseConfig,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        refreshUserData,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
