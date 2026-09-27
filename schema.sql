-- ==============================================================================
-- SWIFT EARN - COMPREHENSIVE SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Run this complete script in your Supabase Dashboard: SQL Editor -> "New Query"
-- ==============================================================================

-- 0. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE (Extends Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_initials TEXT DEFAULT 'SE',
  phone TEXT,
  country TEXT DEFAULT 'Nigeria',
  preferred_payment_method TEXT DEFAULT 'bank_transfer',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  email_notifications BOOLEAN DEFAULT true,
  reward_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. WALLETS TABLE (Strict balance tracking with zero starting balance)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  available_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (available_balance >= 0),
  pending_rewards NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (pending_rewards >= 0),
  total_earned NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (total_earned >= 0),
  total_withdrawn NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (total_withdrawn >= 0),
  currency TEXT DEFAULT 'NGN' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. LEDGER ENTRIES TABLE (Immutable double-entry financial audit trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('reward_credit', 'withdrawal_debit', 'referral_bonus', 'adjustment')),
  amount NUMERIC(12, 2) NOT NULL,
  running_balance NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'confirmed' NOT NULL CHECK (status IN ('confirmed', 'pending', 'reversed')),
  reference TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. WITHDRAWALS TABLE (Payout requests tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'NGN' NOT NULL,
  payment_method TEXT NOT NULL,
  account_details JSONB NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  reference TEXT UNIQUE NOT NULL,
  admin_notes TEXT,
  provider_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. REFERRALS TABLE (Track affiliate relationships & status)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'rewarded')),
  reward_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. REWARD SESSIONS TABLE (Anti-cheat timed advertising sessions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reward_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  expected_amount NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'started' NOT NULL CHECK (status IN ('started', 'completed', 'claimed', 'expired', 'invalidated')),
  session_token TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==============================================================================
-- 7. REWARD EVENTS TABLE (Impression, click, and verification audit trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reward_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.reward_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'impression', 'click', 'verification', 'claim'
  provider TEXT NOT NULL,
  amount NUMERIC(12, 2) DEFAULT 0.00,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. NOTIFICATIONS TABLE (User in-app notifications)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system' NOT NULL CHECK (type IN ('system', 'reward', 'withdrawal', 'referral', 'security')),
  is_read BOOLEAN DEFAULT false NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 9. AUDIT LOGS TABLE (Platform security & regulatory compliance)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 10. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_reward_sessions_user_id ON public.reward_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_events_user_id ON public.reward_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- 11.2 Wallets Policies
-- CRITICAL SECURITY RULE: Users can ONLY SELECT their own wallet balance.
-- Direct UPDATE/INSERT by client is strictly blocked. Balance changes happen via SECURITY DEFINER functions.
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users cannot directly update wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users cannot directly insert wallet" ON public.wallets;

-- 11.3 Ledger Entries Policies (Append-only by system, users can only view their own)
DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can view own ledger entries"
  ON public.ledger_entries FOR SELECT
  USING (auth.uid() = user_id);

-- 11.4 Withdrawals Policies
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

-- 11.5 Referrals Policies
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 11.6 Reward Sessions Policies
DROP POLICY IF EXISTS "Users can view own reward sessions" ON public.reward_sessions;
CREATE POLICY "Users can view own reward sessions"
  ON public.reward_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reward sessions" ON public.reward_sessions;
CREATE POLICY "Users can insert own reward sessions"
  ON public.reward_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reward sessions" ON public.reward_sessions;
CREATE POLICY "Users can update own reward sessions"
  ON public.reward_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- 11.7 Reward Events Policies
DROP POLICY IF EXISTS "Users can view own reward events" ON public.reward_events;
CREATE POLICY "Users can view own reward events"
  ON public.reward_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reward events" ON public.reward_events;
CREATE POLICY "Users can insert own reward events"
  ON public.reward_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 11.8 Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 11.9 Audit Logs Policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 12. SECURE DATABASE TRIGGER: AUTO-CREATE PROFILE & ZERO-BALANCE WALLET
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  initials TEXT;
  raw_name TEXT;
  ref_by TEXT;
  referrer_record RECORD;
BEGIN
  -- Extract raw metadata provided during signup
  raw_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Swift Earner');
  ref_by := new.raw_user_meta_data->>'referred_by';

  -- Calculate clean initials
  initials := UPPER(SUBSTRING(raw_name FROM 1 FOR 2));
  IF LENGTH(initials) = 0 THEN
    initials := 'SE';
  END IF;

  -- Generate unique referral code (e.g. SE + 6 random chars)
  ref_code := UPPER('SE' || SUBSTRING(MD5(RANDOM()::TEXT || new.id::TEXT) FROM 1 FOR 6));

  -- 1. Insert Profile
  INSERT INTO public.profiles (
    id,
    user_id,
    full_name,
    avatar_initials,
    referral_code,
    referred_by
  ) VALUES (
    new.id,
    new.id,
    raw_name,
    initials,
    ref_code,
    ref_by
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Insert Wallet with strictly 0.00 starting balance
  INSERT INTO public.wallets (
    user_id,
    available_balance,
    pending_rewards,
    total_earned,
    total_withdrawn,
    currency
  ) VALUES (
    new.id,
    0.00,
    0.00,
    0.00,
    0.00,
    'NGN'
  ) ON CONFLICT (user_id) DO NOTHING;

  -- 3. If referred by a valid code, record referral
  IF ref_by IS NOT NULL AND LENGTH(TRIM(ref_by)) > 0 THEN
    SELECT * INTO referrer_record FROM public.profiles WHERE referral_code = TRIM(ref_by) LIMIT 1;
    IF referrer_record.id IS NOT NULL AND referrer_record.id <> new.id THEN
      INSERT INTO public.referrals (
        referrer_id,
        referred_user_id,
        referral_code,
        status,
        reward_amount
      ) VALUES (
        referrer_record.id,
        new.id,
        TRIM(ref_by),
        'pending',
        50.00
      ) ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  -- 4. Create welcome notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    new.id,
    'Welcome to Swift Earn!',
    'Your account and secure wallet have been created. Start viewing verified partner campaigns to earn confirmed cash rewards.',
    'system'
  );

  -- 5. Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    new.id,
    'USER_SIGNED_UP',
    'auth.users',
    new.id::TEXT,
    jsonb_build_object('email', new.email, 'full_name', raw_name, 'referral_code', ref_code)
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 13. SECURE SERVER-SIDE RPC: CREDIT REWARD (ATOMIC TRANSACTION & LEDGER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.credit_reward(
  p_session_id UUID,
  p_opportunity_id TEXT,
  p_amount NUMERIC,
  p_provider TEXT,
  p_title TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_session RECORD;
  v_ref TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  IF p_amount <= 0 OR p_amount > 500 THEN
    RAISE EXCEPTION 'Invalid reward amount';
  END IF;

  -- Verify session if provided
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM public.reward_sessions
    WHERE id = p_session_id AND user_id = v_user_id;

    IF v_session.id IS NOT NULL AND v_session.status = 'claimed' THEN
      RAISE EXCEPTION 'Reward already claimed for this session';
    END IF;

    UPDATE public.reward_sessions
    SET status = 'claimed', claimed_at = now()
    WHERE id = p_session_id AND user_id = v_user_id;
  END IF;

  -- Lock wallet row to prevent race conditions
  SELECT available_balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO public.wallets (user_id, available_balance, pending_rewards, total_earned, total_withdrawn, currency)
    VALUES (v_user_id, 0.00, 0.00, 0.00, 0.00, 'NGN');
    v_current_balance := 0.00;
  END IF;

  v_new_balance := v_current_balance + p_amount;
  v_ref := 'SE-REW-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 1. Update wallet balance
  UPDATE public.wallets
  SET
    available_balance = v_new_balance,
    total_earned = total_earned + p_amount,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 2. Create immutable ledger entry
  INSERT INTO public.ledger_entries (
    user_id,
    entry_type,
    amount,
    running_balance,
    status,
    reference,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'reward_credit',
    p_amount,
    v_new_balance,
    'confirmed',
    v_ref,
    'Reward from ' || COALESCE(p_provider, 'Sponsor') || ' (' || COALESCE(p_title, 'Ad Opportunity') || ')',
    jsonb_build_object('opportunity_id', p_opportunity_id, 'provider', p_provider, 'session_id', p_session_id)
  );

  -- 3. Record reward event
  INSERT INTO public.reward_events (
    user_id,
    session_id,
    event_type,
    provider,
    amount,
    details
  ) VALUES (
    v_user_id,
    p_session_id,
    'claim',
    COALESCE(p_provider, 'Direct'),
    p_amount,
    jsonb_build_object('reference', v_ref, 'opportunity_id', p_opportunity_id)
  );

  -- 4. In-app notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_user_id,
    'Reward Credited!',
    'You earned ₦' || TO_CHAR(p_amount, 'FM999,999,990.00') || ' from ' || COALESCE(p_provider, 'verified partner') || '.',
    'reward'
  );

  -- 5. Audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    'REWARD_CREDITED',
    'wallets',
    v_user_id::TEXT,
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance, 'reference', v_ref)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward credited successfully',
    'pointsEarned', p_amount,
    'newBalance', v_new_balance,
    'transactionReference', v_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 14. SECURE SERVER-SIDE RPC: REQUEST WITHDRAWAL (ATOMIC DEBIT & AUDIT)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_account_details JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_ref TEXT;
  v_withdrawal_id UUID;
  v_min_withdrawal NUMERIC(12, 2) := 500.00;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  IF p_amount < v_min_withdrawal THEN
    RAISE EXCEPTION 'Minimum withdrawal is ₦500.00';
  END IF;

  -- Lock wallet row
  SELECT available_balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance. Current balance: ₦%', COALESCE(v_current_balance, 0.00);
  END IF;

  v_new_balance := v_current_balance - p_amount;
  v_ref := 'SE-WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 1. Deduct balance immediately
  UPDATE public.wallets
  SET
    available_balance = v_new_balance,
    total_withdrawn = total_withdrawn + p_amount,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 2. Create pending withdrawal record
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    currency,
    payment_method,
    account_details,
    status,
    reference
  ) VALUES (
    v_user_id,
    p_amount,
    'NGN',
    COALESCE(p_payment_method, 'bank_transfer'),
    p_account_details,
    'pending',
    v_ref
  ) RETURNING id INTO v_withdrawal_id;

  -- 3. Create debit ledger entry
  INSERT INTO public.ledger_entries (
    user_id,
    entry_type,
    amount,
    running_balance,
    status,
    reference,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'withdrawal_debit',
    -p_amount,
    v_new_balance,
    'confirmed',
    v_ref,
    'Payout Request (' || COALESCE(p_payment_method, 'Bank Transfer') || ')',
    jsonb_build_object('withdrawal_id', v_withdrawal_id, 'payment_method', p_payment_method)
  );

  -- 4. In-app notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_user_id,
    'Payout Request Submitted',
    'Your withdrawal request of ₦' || TO_CHAR(p_amount, 'FM999,999,990.00') || ' has been queued for verification (Ref: ' || v_ref || ').',
    'withdrawal'
  );

  -- 5. Audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    'WITHDRAWAL_REQUESTED',
    'withdrawals',
    v_withdrawal_id::TEXT,
    jsonb_build_object('amount', p_amount, 'reference', v_ref, 'remaining_balance', v_new_balance)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request submitted successfully.',
    'reference', v_ref,
    'withdrawalId', v_withdrawal_id,
    'newBalance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION public.credit_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal TO authenticated;
