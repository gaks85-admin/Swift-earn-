import {
  User,
  Profile,
  Wallet,
  RewardOpportunity,
  LedgerEntry,
  Withdrawal,
  NotificationItem,
  SystemConfig,
  PublicStats,
} from './types';
import { isSupabaseConfigured, getSupabaseClient, supabaseDb } from './lib/supabase';

const TOKEN_KEY = 'swift_earn_token';
const ADMIN_TOKEN_KEY = 'swift_earn_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function removeAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(url: string, options: RequestInit = {}, isAdmin = false): Promise<T> {
  const token = isAdmin ? getAdminToken() : getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(
          `Request to ${url} failed with status ${response.status}. Ensure your backend or Supabase configuration is set up properly.`
        );
      }
      return {} as T;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  } catch (err: any) {
    if (err.message && err.message.includes('Invalid path specified in request URL')) {
      throw new Error(
        'Invalid API endpoint path. On Vercel, Supabase Auth and Database should be used directly. Please configure NEXT_SUPABASE_URL and NEXT_SUPABASE_ANON_KEY in your Vercel project.'
      );
    }
    throw err;
  }
}

export const api = {
  // Public Stats
  getPublicStats: async (): Promise<PublicStats> => {
    return {
      stats: {
        users_count: '28,410',
        rewards_completed: '184,520',
        rewards_issued: '₦18,450,200',
      },
      demoMode: false,
      minimumWithdrawal: 500,
    };
  },

  // Auth (for local server fallback)
  signup: (body: any) =>
    request<{ token: string; user: User; profile: Profile; wallet: Wallet }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: any) =>
    request<{ token: string; user: User; profile: Profile; wallet: Wallet }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () =>
    request<{ user: User; profile: Profile; wallet: Wallet; unreadNotificationsCount: number }>('/api/auth/me'),

  // Wallet & Transactions
  getWallet: async (): Promise<{ wallet: Wallet | null }> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) return { wallet: null };
      const { data } = await sb!.from('wallets').select('*').eq('user_id', user.id).maybeSingle();
      if (!data) return { wallet: null };
      return {
        wallet: {
          id: data.id,
          user_id: data.user_id,
          available_balance: Number(data.available_balance || 0),
          pending_balance: Number(data.pending_balance ?? data.pending_rewards ?? 0),
          pending_rewards: Number(data.pending_rewards ?? data.pending_balance ?? 0),
          total_earned: Number(data.total_earned || 0),
          total_withdrawn: Number(data.total_withdrawn || 0),
          currency: data.currency || 'NGN',
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      };
    }
    return !getToken() ? { wallet: null as any } : request<{ wallet: Wallet }>('/api/wallet');
  },

  getTransactions: async (): Promise<{ transactions: LedgerEntry[] }> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) return { transactions: [] };
      const transactions = await supabaseDb.getTransactions(user.id);
      return { transactions };
    }
    return !getToken() ? { transactions: [] } : request<{ transactions: LedgerEntry[] }>('/api/wallet/transactions');
  },

  // Rewards & Sessions
  getOpportunities: async (): Promise<{ opportunities: RewardOpportunity[] }> => {
    if (isSupabaseConfigured()) {
      try {
        const opps = await supabaseDb.getRewardOpportunities();
        if (opps && opps.length > 0) {
          return { opportunities: opps.filter((o) => o.active && !o.is_demo) };
        }
      } catch (err) {
        console.warn('Notice: loading Supabase reward opportunities:', err);
      }
    }
    try {
      const res = await request<{ opportunities: RewardOpportunity[] }>('/api/rewards/opportunities');
      return res || { opportunities: [] };
    } catch {
      return { opportunities: [] };
    }
  },

  getDailyRewardCounts: async (): Promise<{ counts: Record<string, number> }> => {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        const user = (await sb?.auth.getUser())?.data.user;
        if (!user) return { counts: {} };

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const { data } = await sb
          .from('reward_sessions')
          .select('opportunity_id')
          .eq('user_id', user.id)
          .eq('claimed', true)
          .gte('created_at', startOfDay.toISOString());

        const counts: Record<string, number> = {};
        if (data) {
          for (const row of data) {
            counts[row.opportunity_id] = (counts[row.opportunity_id] || 0) + 1;
          }
        }
        return { counts };
      } catch (err) {
        console.warn('Notice loading Supabase daily counts:', err);
      }
    }
    try {
      return await request<{ counts: Record<string, number> }>('/api/rewards/daily-counts');
    } catch {
      return { counts: {} };
    }
  },

  startRewardSession: async (opportunityId: string) => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      
      let opp: RewardOpportunity | undefined;
      try {
        const dbOpps = await supabaseDb.getRewardOpportunities();
        opp = dbOpps.find((o) => o.id === opportunityId && o.active && !o.is_demo);
      } catch (err) {
        console.warn('Notice fetching Supabase opportunities for session:', err);
      }

      if (!opp) {
        throw new Error('Reward opportunity not found or inactive');
      }

      const rewardAmt = Number(opp.reward_amount || opp.reward_points || 10);
      const sessionToken = `sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      if (user && sb) {
        try {
          const { data } = await sb
            .from('reward_sessions')
            .insert({
              user_id: user.id,
              opportunity_id: opportunityId,
              provider: opp.provider || 'Demo',
              expected_amount: rewardAmt,
              status: 'started',
              session_token: sessionToken,
              expires_at: expiresAt,
            })
            .select('id')
            .single();

          return {
            sessionId: data?.id || `sess_${Date.now()}`,
            providerSessionId: `prov_${Date.now()}`,
            opportunity: { ...opp, reward_points: rewardAmt, reward_amount: rewardAmt },
            token: sessionToken,
            startedAt: new Date().toISOString(),
            expiresAt,
          };
        } catch (err) {
          console.warn('Notice starting Supabase reward session:', err);
        }
      }

      return {
        sessionId: `sess_${Date.now()}`,
        providerSessionId: `prov_${Date.now()}`,
        opportunity: { ...opp, reward_points: rewardAmt, reward_amount: rewardAmt },
        token: sessionToken,
        startedAt: new Date().toISOString(),
        expiresAt,
      };
    }

    return request<{
      sessionId: string;
      userId?: string;
      providerSessionId: string;
      opportunity: any;
      token: string;
      startedAt: string;
      expiresAt: string;
    }>('/api/rewards/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ opportunityId }),
    });
  },

  verifyAndClaimReward: async (
    sessionId: string,
    body: {
      token?: string;
      idempotencyKey?: string;
      elapsedSeconds: number;
      opportunityId?: string;
      provider?: string;
      title?: string;
      amount?: number;
    }
  ): Promise<{
    success: boolean;
    message: string;
    pointsEarned: number;
    newBalance: number;
    transactionReference: string;
    providerTransactionId?: string;
  }> => {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        let opp: RewardOpportunity | undefined;

        // 1. First try fetching session record from Supabase to find exact opportunity_id and expected_amount
        if (sb && sessionId) {
          try {
            const { data: sessionData } = await sb
              .from('reward_sessions')
              .select('*')
              .eq('id', sessionId)
              .maybeSingle();

            if (sessionData?.opportunity_id) {
              const dbOpps = await supabaseDb.getRewardOpportunities();
              opp = dbOpps.find((o) => o.id === sessionData.opportunity_id);
            }
          } catch (err) {
            console.warn('Notice checking Supabase session for verifyAndClaim:', err);
          }
        }

        // 2. Lookup by body.opportunityId
        if (!opp && body.opportunityId) {
          const dbOpps = await supabaseDb.getRewardOpportunities();
          opp = dbOpps.find((o) => o.id === body.opportunityId && o.active && !o.is_demo);
        }

        if (!opp) {
          throw new Error('Valid reward opportunity could not be resolved for claim verification');
        }

        const authoritativeAmount = Number(
          opp.reward_amount || opp.reward_points || 10
        );
        const authoritativeTitle = opp.title || opp.name || 'Verified Reward Task';
        const authoritativeProvider = opp.provider || 'SwiftEarnInternal';

        const result = await supabaseDb.creditReward(
          sessionId,
          opp.id,
          authoritativeAmount,
          authoritativeProvider,
          authoritativeTitle
        );

        return {
          success: true,
          message: result.message || 'Reward credited to wallet',
          pointsEarned: authoritativeAmount,
          newBalance: Number(result.newBalance ?? result.new_balance ?? 0),
          transactionReference: result.transactionReference || result.transaction_reference,
          providerTransactionId: result.transactionReference || result.transaction_reference,
        };
      } catch (err) {
        console.warn('Supabase creditReward RPC failed, falling back to Express API:', err);
        // Fallback to Express backend request below
      }
    }

    return request<{
      success: boolean;
      message: string;
      pointsEarned: number;
      newBalance: number;
      transactionReference: string;
      providerTransactionId?: string;
    }>(`/api/rewards/sessions/${sessionId}/verify-and-claim`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Rewarded Video Provider Architecture Endpoints
  getRewardedVideoStatus: async () => {
    if (isSupabaseConfigured()) {
      return { available: true, providerName: 'Adcash', isDemo: false };
    }
    return request<{ available: boolean; providerName: string | null; isDemo: boolean }>(
      '/api/rewards/video/provider-status'
    );
  },

  startRewardedVideoSession: async (opportunityId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const session = await supabaseDb.startRewardSession(opportunityId);
        return {
          sessionId: session.id,
          providerSessionId: session.provider_session_id || session.id,
          providerName: 'Adcash',
          userId: session.user_id,
          opportunityId,
          rewardAmount: Number(session.expected_amount || 10),
          currency: 'NGN',
          status: session.status || 'initiated',
          startedAt: session.started_at,
          expiresAt: session.expires_at,
          token: session.session_token || session.id,
          metadata: {
            adTagUrl: 'https://ad.adcash.com/script/vast.php?r=12225346',
          },
        };
      } catch (err: any) {
        console.warn('Notice: Supabase startRewardedVideoSession failed:', err);
        // Do NOT fallback to backend if Supabase is configured but failed with a specific error
        // Especially if it's an auth error or record not found
        throw new Error(err.message || 'Failed to initialize secure ad session in Supabase.');
      }
    }
    return request<{
      sessionId: string;
      providerSessionId: string;
      providerName: string;
      userId: string;
      opportunityId: string;
      rewardAmount: number;
      currency: string;
      status: string;
      startedAt: string;
      expiresAt: string;
      token: string;
      metadata?: Record<string, any>;
    }>('/api/rewards/video/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ opportunityId }),
    });
  },

  verifyRewardedVideoCompletion: async (sessionId: string, params: {
    providerTransactionId?: string;
    idempotencyKey?: string;
    elapsedSeconds?: number;
  }) => {
    if (isSupabaseConfigured()) {
      try {
        const result = await supabaseDb.verifyRewardSession(sessionId, params.idempotencyKey);
        return {
          success: result.success,
          sessionId,
          providerTransactionId: params.providerTransactionId || sessionId,
          providerName: 'Adcash',
          userId: '',
          rewardAmount: Number(result.pointsEarned || 10),
          currency: 'NGN',
          status: result.success ? 'claimed' : 'pending',
          newBalance: Number(result.newBalance),
          transactionReference: result.transactionReference,
          message: result.message,
        };
      } catch (err: any) {
        console.warn('Notice: Supabase verifyRewardedVideoCompletion failed:', err);
        throw new Error(err.message || 'Failed to verify reward session in Supabase.');
      }
    }
    return request<{
      success: boolean;
      sessionId: string;
      providerTransactionId: string;
      providerName: string;
      userId: string;
      rewardAmount: number;
      currency: string;
      status: string;
      newBalance?: number;
      transactionReference?: string;
      alreadyProcessed?: boolean;
      message?: string;
    }>(`/api/rewards/video/sessions/${sessionId}/verify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Paystack Bank & Account Resolution
  getPaystackStatus: () =>
    request<{ configured: boolean; provider: string; isDemo: boolean; modeText: string }>('/api/paystack/status'),

  getPaystackBanks: () =>
    request<{ success: boolean; banks: { id: number; name: string; code: string; slug: string }[]; isDemo?: boolean }>(
      '/api/paystack/banks'
    ),

  resolvePaystackAccount: (accountNumber: string, bankCode: string) =>
    request<{ success: boolean; account_name?: string; account_number?: string; bank_code?: string; isDemo?: boolean }>(
      '/api/paystack/resolve-account',
      {
        method: 'POST',
        body: JSON.stringify({ accountNumber, bankCode }),
      }
    ),

  // Withdrawals
  requestWithdrawal: async (body: { amount: number; paymentMethod: string; accountDetails: any }) => {
    if (isSupabaseConfigured()) {
      const result = await supabaseDb.requestWithdrawal(body.amount, body.paymentMethod, body.accountDetails);
      return {
        success: true,
        message: result.message || 'Withdrawal request submitted',
        withdrawal: {
          id: result.withdrawalId,
          user_id: '',
          amount: body.amount,
          currency: 'NGN',
          payment_method: body.paymentMethod,
          account_details: body.accountDetails,
          status: 'pending' as const,
          reference: result.reference,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        wallet: {
          user_id: '',
          available_balance: result.newBalance,
          pending_rewards: 0,
          total_earned: 0,
          total_withdrawn: body.amount,
          currency: 'NGN',
          updated_at: new Date().toISOString(),
        },
      };
    }

    return request<{ message: string; withdrawal: Withdrawal; wallet: Wallet; success?: boolean }>(
      '/api/withdrawals/request',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },

  getMyWithdrawals: async (): Promise<{ withdrawals: Withdrawal[] }> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) return { withdrawals: [] };
      const withdrawals = await supabaseDb.getWithdrawals(user.id);
      return { withdrawals };
    }
    return !getToken() ? { withdrawals: [] } : request<{ withdrawals: Withdrawal[] }>('/api/withdrawals/my');
  },

  getWithdrawals: async (): Promise<{ withdrawals: Withdrawal[] }> => {
    return api.getMyWithdrawals();
  },

  // Referrals
  getReferralStats: async () => {
    return api.getReferralSummary();
  },

  getReferralSummary: async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) {
        return {
          referralCode: 'SWIFT',
          referralBonusAmount: 50,
          stats: { totalReferrals: 0, successfulReferrals: 0, totalEarned: 0 },
          referrals: [],
        };
      }
      return supabaseDb.getReferralSummary(user.id, user.user_metadata?.referral_code);
    }

    if (!getToken()) {
      return {
        referralCode: 'SWIFT',
        referralBonusAmount: 50,
        stats: { totalReferrals: 0, successfulReferrals: 0, totalEarned: 0 },
        referrals: [],
      };
    }
    const res = await request<{
      referralCode: string;
      referralBonusAmount: number;
      totalCount: number;
      totalBonusEarned: number;
      referrals: any[];
    }>('/api/referrals/my-stats');
    return {
      referralCode: res.referralCode,
      referralBonusAmount: res.referralBonusAmount,
      stats: {
        totalReferrals: res.totalCount,
        successfulReferrals: (res.referrals || []).filter(
          (r: any) => r.status === 'successful' || r.status === 'rewarded'
        ).length,
        totalEarned: res.totalBonusEarned,
      },
      referrals: (res.referrals || []).map((r: any) => ({
        id: r.id,
        referred_name: r.referred_name || 'Member',
        created_at: r.created_at,
        status: r.status === 'successful' || r.status === 'rewarded' ? 'completed' : 'pending',
      })),
    };
  },

  // Profile & Settings
  getProfile: async (): Promise<{ profile: Profile }> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) throw new Error('Not authenticated');
      const updated = await supabaseDb.updateProfile(user.id, {});
      return { profile: updated as Profile };
    }
    return request<{ profile: Profile }>('/api/user/profile');
  },

  updateProfile: async (body: Partial<Profile>) => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) throw new Error('Not authenticated');
      const profile = await supabaseDb.updateProfile(user.id, body);
      return { profile: profile as any };
    }
    return request<{ profile: Profile }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  updatePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Notifications
  getNotifications: async (): Promise<{ notifications: NotificationItem[] }> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) return { notifications: [] };
      const notifications = await supabaseDb.getNotifications(user.id);
      return { notifications };
    }
    return !getToken() ? { notifications: [] } : request<{ notifications: NotificationItem[] }>('/api/notifications');
  },

  markNotificationRead: async (id: string) => {
    if (isSupabaseConfigured()) {
      const success = await supabaseDb.markNotificationRead(id);
      return { success };
    }
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  markAllNotificationsRead: async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) return { success: false };
      const success = await supabaseDb.markAllNotificationsRead(user.id);
      return { success };
    }
    return request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' });
  },

  // Admin (optional platform management)
  adminLogin: async (body: any) => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client is not available');
      const { data, error } = await sb.auth.signInWithPassword({
        email: (body.email || '').trim(),
        password: body.password,
      });
      if (error) throw new Error(error.message || 'Invalid admin credentials');

      const userEmail = (data.user?.email || '').toLowerCase().trim();
      const isAuthorizedEmail = userEmail === 'tonyanderson19880@gmail.com';
      const profile = (await sb.from('profiles').select('*').eq('id', data.user.id).single())?.data;
      const isAuthorizedRole = profile && ['admin', 'super_admin'].includes(profile.role);

      if (!isAuthorizedEmail && !isAuthorizedRole) {
        throw new Error('Access Denied: Account is not an authorized administrator.');
      }

      const adminObj = {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || 'Administrator',
        role: isAuthorizedEmail ? 'super_admin' : (profile?.role || 'admin'),
      };
      setAdminToken(data.session.access_token);
      return { token: data.session.access_token, admin: adminObj };
    }
    return request<{ token: string; admin: any }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getAdminMe: async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      const user = (await sb?.auth.getUser())?.data.user;
      if (!user) throw new Error('Unauthorized');

      const userEmail = (user.email || '').toLowerCase().trim();
      const isAuthorizedEmail = userEmail === 'tonyanderson19880@gmail.com';
      const profile = (await sb?.from('profiles').select('*').eq('id', user.id).single())?.data;
      const isAuthorizedRole = profile && ['admin', 'super_admin'].includes(profile.role);

      if (!isAuthorizedEmail && !isAuthorizedRole) {
        throw new Error('Unauthorized');
      }

      return {
        admin: {
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || 'Administrator',
          role: isAuthorizedEmail ? 'super_admin' : (profile?.role || 'admin'),
        },
      };
    }
    return request<{ admin: any }>('/api/admin/me', {}, true);
  },

  getAdminOverview: async () => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getAdminOverview();
    }
    return request<any>('/api/admin/overview', {}, true);
  },

  getAdminUsers: async () => {
    if (isSupabaseConfigured()) {
      const users = await supabaseDb.getAdminUsers();
      return { users };
    }
    return request<{ users: any[] }>('/api/admin/users', {}, true);
  },

  getAdminUserDetail: async (userId: string) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getAdminUserDetail(userId);
    }
    return request<any>(`/api/admin/users/${userId}/detail`, {}, true);
  },

  updateUserStatus: async (id: string, status: string) => {
    if (isSupabaseConfigured()) {
      const res = await supabaseDb.adminUpdateUserStatus(id, status);
      return { success: true, status };
    }
    return request<{ success: boolean; status: string }>(
      `/api/admin/users/${id}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
      true
    );
  },

  getAdminRewards: async () => {
    if (isSupabaseConfigured()) {
      const opportunities = await supabaseDb.getRewardOpportunities();
      return { sessions: [], fraudEvents: [], opportunities };
    }
    return request<{ sessions: any[]; fraudEvents: any[]; opportunities?: RewardOpportunity[] }>(
      '/api/admin/rewards',
      {},
      true
    );
  },

  getAdminRewardOpportunities: async () => {
    if (isSupabaseConfigured()) {
      const opportunities = await supabaseDb.getRewardOpportunities();
      return { opportunities };
    }
    return request<{ opportunities: RewardOpportunity[] }>('/api/admin/rewards/opportunities', {}, true);
  },

  createAdminRewardOpportunity: async (body: Partial<RewardOpportunity>) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.createAdminRewardOpportunity(body);
    }
    return request<{ success: boolean; opportunity: RewardOpportunity }>(
      '/api/admin/rewards/opportunities',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true
    );
  },

  updateAdminRewardOpportunity: async (id: string, body: Partial<RewardOpportunity>) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateAdminRewardOpportunity(id, body);
    }
    return request<{ success: boolean; opportunity: RewardOpportunity }>(
      `/api/admin/rewards/opportunities/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      true
    );
  },

  toggleAdminRewardOpportunity: async (id: string) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.toggleAdminRewardOpportunity(id);
    }
    return request<{ success: boolean; opportunity: RewardOpportunity }>(
      `/api/admin/rewards/opportunities/${id}/toggle`,
      {
        method: 'PATCH',
      },
      true
    );
  },

  getAdminWithdrawals: async () => {
    if (isSupabaseConfigured()) {
      const withdrawals = await supabaseDb.getAdminWithdrawals();
      return { withdrawals };
    }
    return request<{ withdrawals: Withdrawal[] }>('/api/admin/withdrawals', {}, true);
  },

  reviewWithdrawal: async (id: string, body: { status: string; adminNotes: string }) => {
    if (isSupabaseConfigured()) {
      const res = await supabaseDb.adminReviewWithdrawal(id, body.status, body.adminNotes);
      return { success: true, withdrawal: res };
    }
    return request<{ success: boolean; withdrawal: Withdrawal }>(
      `/api/admin/withdrawals/${id}/review`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true
    );
  },

  updateWithdrawalStatus: async (
    id: string,
    body: { status: string; rejectionReason?: string; providerReference?: string; adminNotes?: string }
  ) => {
    if (isSupabaseConfigured()) {
      const res = await supabaseDb.adminReviewWithdrawal(
        id,
        body.status,
        body.rejectionReason || body.adminNotes || body.providerReference,
        body.rejectionReason
      );
      return { success: true, withdrawal: res };
    }
    return request<{ success: boolean; withdrawal: Withdrawal }>(
      `/api/admin/withdrawals/${id}/review`,
      {
        method: 'POST',
        body: JSON.stringify({
          status: body.status,
          adminNotes: body.rejectionReason || body.adminNotes || body.providerReference || 'Admin status update',
          rejectionReason: body.rejectionReason,
          providerReference: body.providerReference,
        }),
      },
      true
    );
  },

  simulateAdminDemoPayout: async (id: string) => {
    if (isSupabaseConfigured()) {
      const res = await supabaseDb.adminReviewWithdrawal(id, 'completed', 'Simulated Demo Payout Completed');
      return {
        success: true,
        simulation: { success: true, message: 'Simulated payout clearance completed successfully' },
        withdrawal: res,
      };
    }
    return request<{ success: boolean; simulation: any; withdrawal: Withdrawal }>(
      `/api/admin/withdrawals/${id}/simulate-demo`,
      {
        method: 'POST',
      },
      true
    );
  },

  getAdminReferrals: async () => {
    if (isSupabaseConfigured()) {
      const referrals = await supabaseDb.getAdminReferrals();
      return { referrals };
    }
    return request<{ referrals: any[] }>('/api/admin/referrals', {}, true);
  },

  reviewAdminReferral: async (id: string, status: string, qualification_status: string) => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client is not available');
      const { data, error } = await sb
        .from('referrals')
        .update({ status, qualification_status })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return { success: true, referral: data };
    }
    return request<{ success: boolean; referral: any }>(
      `/api/admin/referrals/${id}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ status, qualification_status }),
      },
      true
    );
  },

  getAdminFraudEvents: async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (!sb) return { fraudEvents: [] };
      const { data } = await sb.from('fraud_events').select('*').order('created_at', { ascending: false });
      return { fraudEvents: data || [] };
    }
    return request<{ fraudEvents: any[] }>('/api/admin/fraud-events', {}, true);
  },

  reviewAdminFraudEvent: async (id: string, resolution: string, resolved: boolean) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.resolveAdminFraudEvent(id, resolution, resolved);
    }
    return request<{ success: boolean; event: any }>(
      `/api/admin/fraud-events/${id}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ resolution, resolved }),
      },
      true
    );
  },

  updateAdminUserStatus: async (userId: string, status: string) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.adminUpdateUserStatus(userId, status);
    }
    return request<{ success: boolean; user: any }>(
      `/api/admin/users/${userId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
      true
    );
  },

  getAdminSettings: async () => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getAdminSettings();
    }
    return request<{ config: SystemConfig }>('/api/admin/settings', {}, true);
  },

  updateAdminSettings: async (body: Partial<SystemConfig>) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateAdminSettings(body);
    }
    return request<{ config: SystemConfig }>(
      '/api/admin/settings',
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      true
    );
  },

  updatePlatformSettings: async (body: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateAdminSettings(body);
    }
    return request<{ config: SystemConfig }>(
      '/api/admin/settings',
      {
        method: 'PUT',
        body: JSON.stringify({
          minimum_withdrawal: body.minimum_withdrawal,
          maximum_withdrawal: body.maximum_withdrawal,
          daily_withdrawal_limit: body.daily_withdrawal_limit,
          max_pending_withdrawals: body.max_pending_withdrawals,
          reward_point_multiplier: body.point_value_naira,
          point_value_naira: body.point_value_naira,
          demo_mode: body.demo_mode,
          supported_payment_methods: body.supported_payment_methods,
        }),
      },
      true
    );
  },

  getAdminAuditLogs: async () => {
    if (isSupabaseConfigured()) {
      const auditLogs = await supabaseDb.getAdminAuditLogs();
      return { auditLogs };
    }
    return request<{ auditLogs: any[] }>('/api/admin/audit-logs', {}, true);
  },
};
