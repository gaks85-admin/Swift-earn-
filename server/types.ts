export interface User {
  id: string;
  email: string;
  password_hash: string;
  status: 'active' | 'restricted' | 'suspended' | 'flagged' | 'pending_verification';
  referral_code: string;
  referred_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  avatar_initials: string;
  phone?: string;
  country: string;
  preferred_payment_method: 'bank_transfer' | 'fintech_wallet';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  email_notifications: boolean;
  reward_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  user_id: string;
  available_balance: number;
  pending_rewards: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  updated_at: string;
}

export interface RewardOpportunity {
  id: string;
  name?: string;
  title: string;
  description: string;
  category?: 'video' | 'survey' | 'app_trial' | 'sponsored_task';
  reward_points: number;
  reward_amount?: number;
  estimated_seconds: number;
  estimated_duration?: number;
  provider: string;
  is_demo: boolean;
  active: boolean;
  status?: 'active' | 'inactive' | 'archived';
  daily_cap: number;
  daily_limit?: number;
  created_at: string;
  updated_at?: string;
}

export interface RewardSession {
  id: string;
  user_id: string;
  opportunity_id: string;
  provider_session_id: string;
  provider_token: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'verified' | 'claimed' | 'failed' | 'expired';
  ip_address?: string;
  user_agent?: string;
  started_at: string;
  completed_at?: string;
  claimed_at?: string;
  verified_at?: string;
  expires_at: string;
  provider?: string;
  claimed: boolean;
  expected_amount?: number;
  metadata?: Record<string, any>;
}

export interface RewardEvent {
  id: string;
  session_id: string;
  event_type: 'session_start' | 'ad_loaded' | 'ad_impression' | 'ad_progress' | 'ad_complete' | 'claim_attempt' | 'verified_success' | 'session_claim' | 'fraud_flagged';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  entry_type: 'reward_credit' | 'withdrawal_debit' | 'withdrawal_reversal' | 'referral_bonus' | 'admin_adjustment';
  amount: number;
  running_balance: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  reference: string;
  description: string;
  idempotency_key?: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
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

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'rejected' | 'suspicious' | 'registered' | 'successful';
  qualification_status: 'pending' | 'completed' | 'failed';
  reward_amount: number;
  reward_ledger_entry_id?: string;
  created_at: string;
  qualified_at?: string;
  rewarded_at?: string;
  referred_email?: string;
  referred_name?: string;
}

export interface FraudEvent {
  id: string;
  user_id?: string;
  session_id?: string;
  event_type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  risk_score: number;
  flag_reason: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_hash?: string;
  user_agent_hash?: string;
  resolved: boolean;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  resolution?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_resource: string;
  target_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
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
  reward_point_multiplier: number; // e.g. 1 point = 1 NGN
  point_value_naira: number; // 1.0 NGN
  minimum_withdrawal: number; // e.g. 500 NGN
  maximum_withdrawal: number; // e.g. 50000 NGN
  daily_withdrawal_limit: number; // e.g. 100000 NGN
  max_pending_withdrawals: number; // e.g. 1
  supported_payment_methods: string[];
  maximum_daily_rewards: number; // e.g. 30
  referral_bonus_amount: number; // e.g. 50 NGN
  allowed_providers: string[];
  demo_mode: boolean;
  public_stats: {
    users_count: string;
    rewards_completed: string;
    rewards_issued: string;
  };
}

