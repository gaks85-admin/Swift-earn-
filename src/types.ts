export interface User {
  id: string;
  email: string;
  status: 'active' | 'suspended' | 'flagged' | 'pending_verification';
  referralCode: string;
  createdAt?: string;
}

export interface Profile {
  id?: string;
  user_id: string;
  full_name: string;
  email?: string;
  role?: string;
  avatar_initials?: string;
  phone?: string;
  country?: string;
  preferred_payment_method?: 'bank_transfer' | 'fintech_wallet';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  referral_code: string;
  referred_by?: string | null;
  account_status?: 'active' | 'suspended' | 'flagged' | 'pending_verification';
  email_notifications?: boolean;
  reward_alerts?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id?: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  pending_rewards?: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  created_at?: string;
  updated_at: string;
}

export interface RewardOpportunity {
  id: string;
  name: string;
  title?: string;
  description: string;
  category?: 'video' | 'survey' | 'app_trial' | 'sponsored_task';
  reward_amount: number;
  reward_points?: number;
  estimated_duration: number; // seconds
  estimated_seconds?: number;
  daily_limit: number;
  daily_cap?: number;
  status: 'active' | 'inactive' | 'archived';
  provider: string;
  is_demo?: boolean;
  active?: boolean;
  created_at: string;
  updated_at?: string;
}

export type RewardSessionStatus = 'started' | 'initiated' | 'in_progress' | 'pending' | 'completed' | 'verified' | 'claimed' | 'expired' | 'failed' | 'rejected';

export interface RewardSession {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: RewardSessionStatus;
  started_at: string;
  completed_at?: string;
  claimed_at?: string;
  expires_at: string;
  provider?: string;
  provider_session_id?: string;
  provider_token?: string;
  reward_amount?: number;
  expected_amount?: number;
  claimed?: boolean;
  ip_address?: string;
  user_agent?: string;
  idempotency_key?: string;
  metadata?: any;
  created_at?: string;
}

export interface RewardEvent {
  id: string;
  session_id: string;
  event_type: 'session_start' | 'ad_loaded' | 'ad_impression' | 'ad_progress' | 'ad_complete' | 'claim_attempt' | 'verified_success' | 'session_claim' | 'fraud_flagged';
  metadata?: any;
  created_at: string;
}

export interface FraudEvent {
  id: string;
  user_id?: string;
  session_id?: string;
  event_type: string;
  description: string;
  risk_score?: number;
  flag_reason?: string;
  metadata?: any;
  resolved?: boolean;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  type: 'reward' | 'referral' | 'withdrawal' | 'reversal' | 'adjustment' | 'reward_credit' | 'withdrawal_debit' | 'referral_bonus';
  entry_type?: string;
  amount: number;
  running_balance?: number;
  status: 'confirmed' | 'pending' | 'reversed' | 'cancelled';
  reference_type?: string;
  reference_id?: string;
  reference?: string;
  description: string;
  idempotency_key?: string;
  metadata?: any;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency?: string;
  payment_method: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  account_details: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    wallet_id?: string;
    wallet_provider?: string;
    wallet_account_id?: string;
    paystack_recipient_code?: string;
    paystack_reference?: string;
    [key: string]: any;
  };
  reference: string;
  status: 'pending' | 'processing' | 'approved' | 'completed' | 'paid' | 'rejected' | 'failed' | 'cancelled';
  admin_notes?: string;
  admin_note?: string;
  rejection_reason?: string;
  is_demo?: boolean;
  provider_reference?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export type WithdrawalRequest = Withdrawal;

export interface WithdrawalSettings {
  minimum_withdrawal: number;
  maximum_withdrawal: number;
  daily_withdrawal_limit: number;
  max_pending_withdrawals: number;
  supported_payment_methods: string[];
  demo_mode: boolean;
  point_value_naira: number;
}

export interface ReferralSummary {
  referralCode: string;
  referralBonusAmount: number;
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    totalEarned: number;
  };
  referrals: Array<{
    id: string;
    referred_name?: string;
    created_at: string;
    status: string;
  }>;
}


export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reward' | 'withdrawal' | 'referral' | 'system' | 'security';
  read: boolean;
  created_at: string;
}

export interface SystemConfig {
  reward_point_multiplier?: number;
  minimum_withdrawal: number;
  maximum_withdrawal?: number;
  daily_withdrawal_limit?: number;
  max_pending_withdrawals?: number;
  point_value_naira?: number;
  supported_payment_methods?: string[];
  maximum_daily_rewards?: number;
  referral_bonus_amount?: number;
  allowed_providers?: string[];
  demo_mode: boolean;
  public_stats?: {
    users_count: string;
    rewards_completed: string;
    rewards_issued: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  user_id?: string;
  action?: string;
  event_type?: string;
  target_resource?: string;
  target_id?: string;
  details?: any;
  severity?: 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip_address?: string;
  created_at: string;
}

export interface PublicStats {
  stats: {
    users_count: string;
    rewards_completed: string;
    rewards_issued: string;
  };
  demoMode: boolean;
  minimumWithdrawal: number;
}

