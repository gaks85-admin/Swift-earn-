-- ==============================================================================
-- SWIFT EARN - SECURE DATABASE & WALLET FOUNDATION MIGRATION
-- Compatible with Supabase PostgreSQL & Row Level Security (RLS)
-- Run this complete script in your Supabase Dashboard: SQL Editor -> "New Query"
-- ==============================================================================

-- 0. Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE (Connected to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  account_status TEXT DEFAULT 'active' NOT NULL CHECK (account_status IN ('active', 'suspended', 'flagged', 'pending_verification')),
  avatar_initials TEXT DEFAULT 'SE',
  phone TEXT,
  country TEXT DEFAULT 'Nigeria',
  preferred_payment_method TEXT DEFAULT 'bank_transfer',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  email_notifications BOOLEAN DEFAULT true,
  reward_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure user_id matches id if not populated
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- If email column was missing in an earlier migration, ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status') THEN
    ALTER TABLE public.profiles ADD COLUMN account_status TEXT DEFAULT 'active' NOT NULL;
  END IF;
END $$;

-- ==============================================================================
-- 2. WALLETS TABLE (Strict balance tracking with zero starting balance)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  available_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (available_balance >= 0),
  pending_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (pending_balance >= 0),
  pending_rewards NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (pending_rewards >= 0),
  total_earned NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (total_earned >= 0),
  total_withdrawn NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (total_withdrawn >= 0),
  currency TEXT DEFAULT 'NGN' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure pending_balance column exists if migrating from older schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'pending_balance') THEN
    ALTER TABLE public.wallets ADD COLUMN pending_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (pending_balance >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'pending_rewards') THEN
    ALTER TABLE public.wallets ADD COLUMN pending_rewards NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (pending_rewards >= 0);
  END IF;
END $$;

-- ==============================================================================
-- 3. LEDGER ENTRIES TABLE (Immutable audit trail for balance movements)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'reward' NOT NULL CHECK (type IN ('reward', 'referral', 'withdrawal', 'reversal', 'adjustment', 'reward_credit', 'withdrawal_debit', 'referral_bonus')),
  entry_type TEXT DEFAULT 'reward_credit',
  amount NUMERIC(12, 2) NOT NULL,
  running_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  status TEXT DEFAULT 'confirmed' NOT NULL CHECK (status IN ('confirmed', 'pending', 'reversed', 'cancelled')),
  reference_type TEXT,
  reference_id TEXT,
  reference TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure reference_type and reference_id columns exist if migrating
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ledger_entries' AND column_name = 'reference_type') THEN
    ALTER TABLE public.ledger_entries ADD COLUMN reference_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ledger_entries' AND column_name = 'reference_id') THEN
    ALTER TABLE public.ledger_entries ADD COLUMN reference_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ledger_entries' AND column_name = 'type') THEN
    ALTER TABLE public.ledger_entries ADD COLUMN type TEXT DEFAULT 'reward';
  END IF;
END $$;

-- ==============================================================================
-- 4. WITHDRAWALS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'NGN' NOT NULL,
  payment_method TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'failed', 'cancelled')),
  reference TEXT UNIQUE NOT NULL,
  admin_note TEXT,
  rejection_reason TEXT,
  is_demo BOOLEAN DEFAULT true NOT NULL,
  provider_reference TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. REFERRALS TABLE
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
-- 6. REWARD OPPORTUNITIES, SESSIONS & ANTI-FRAUD LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reward_opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  reward_amount NUMERIC(12, 2) NOT NULL CHECK (reward_amount > 0),
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0), -- in seconds
  daily_limit INTEGER DEFAULT 10 NOT NULL CHECK (daily_limit > 0),
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'archived')),
  provider TEXT DEFAULT 'Demo' NOT NULL,
  category TEXT DEFAULT 'video' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default DEMO opportunities
INSERT INTO public.reward_opportunities (id, name, description, reward_amount, estimated_duration, daily_limit, status, provider, category)
VALUES
  ('opp_demo_vid_01', 'Demo Rewarded Video', 'Simulate watching a 30-second rewarded sponsor video to completion.', 10.00, 30, 10, 'active', 'Demo', 'video'),
  ('opp_demo_vid_02', 'Demo Quick Clip', 'Watch a fast 15-second sponsor demonstration clip for rapid reward testing.', 5.00, 15, 15, 'active', 'Demo', 'video'),
  ('opp_demo_survey_01', 'Demo Interactive Survey', 'Simulate completing an interactive brand feedback survey for bonus points.', 15.00, 45, 5, 'active', 'Demo', 'survey'),
  ('opp_demo_app_01', 'Demo App Engagement', 'Simulate testing a partner mobile product and claim verified test points.', 20.00, 60, 5, 'active', 'Demo', 'app_trial')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  estimated_duration = EXCLUDED.estimated_duration,
  daily_limit = EXCLUDED.daily_limit,
  status = EXCLUDED.status,
  provider = EXCLUDED.provider,
  category = EXCLUDED.category,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.reward_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id TEXT REFERENCES public.reward_opportunities(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'started' NOT NULL CHECK (status IN ('started', 'pending', 'completed', 'expired', 'failed', 'rejected')),
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  provider TEXT DEFAULT 'Demo' NOT NULL,
  provider_session_id TEXT,
  reward_amount NUMERIC(12, 2) NOT NULL CHECK (reward_amount > 0),
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fraud_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reward_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.reward_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount NUMERIC(12, 2) DEFAULT 0.00,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. NOTIFICATIONS & AUDIT LOGS
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
-- 8. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
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

-- 9.1 Profiles Policies (Users can read and update only their own profile)
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

-- 9.2 Wallets Policies
-- CRITICAL SECURITY RULE: Users can ONLY SELECT their own wallet balance.
-- Direct UPDATE/INSERT by client is strictly blocked. Balance changes happen via SECURITY DEFINER functions.
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users cannot directly update wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users cannot directly insert wallet" ON public.wallets;

-- 9.3 Ledger Entries Policies (Append-only by system, users can only view their own)
DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can view own ledger entries"
  ON public.ledger_entries FOR SELECT
  USING (auth.uid() = user_id);

-- 9.4 Withdrawals Policies
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

-- 9.5 Referrals Policies
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 9.6 Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 9.7 Reward Sessions Policies
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

-- ==============================================================================
-- 10. AUTOMATIC USER SETUP TRIGGER: AUTO-CREATE PROFILE & ZERO-BALANCE WALLET
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
  ref_code := UPPER('SE' || SUBSTRING(MD5(RANDOM()::TEXT || new.id::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 6));

  -- 1. Insert Profile
  INSERT INTO public.profiles (
    id,
    user_id,
    full_name,
    email,
    avatar_initials,
    referral_code,
    referred_by,
    account_status
  ) VALUES (
    new.id,
    new.id,
    raw_name,
    new.email,
    initials,
    ref_code,
    ref_by,
    'active'
  ) ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  -- 2. Insert Wallet with strictly 0.00 starting balance
  INSERT INTO public.wallets (
    user_id,
    available_balance,
    pending_balance,
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
    0.00,
    'NGN'
  ) ON CONFLICT (user_id) DO NOTHING;

  -- 3. If referred by a valid code, record referral
  IF ref_by IS NOT NULL AND LENGTH(TRIM(ref_by)) > 0 THEN
    SELECT * INTO referrer_record FROM public.profiles WHERE upper(referral_code) = upper(TRIM(ref_by)) LIMIT 1;
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
    'Your account and zero-balance wallet have been securely initialized. Complete verified sponsor tasks to earn confirmed rewards.',
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
-- 11. SECURE DATABASE FUNCTIONS (RPC)
-- ==============================================================================

-- 11.1 CREDIT REWARD (Validates, locks wallet, credits balance, creates ledger entry)
CREATE OR REPLACE FUNCTION public.credit_reward(
  p_session_id UUID DEFAULT NULL,
  p_opportunity_id TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT 50.00,
  p_provider TEXT DEFAULT 'Partner',
  p_title TEXT DEFAULT 'Reward Opportunity'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_session RECORD;
  v_ref TEXT;
  
  -- Variables for referral processing
  v_referral RECORD;
  v_referrer_balance NUMERIC(12, 2);
  v_referrer_new_balance NUMERIC(12, 2);
  v_ref_ref TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  IF p_amount <= 0 OR p_amount > 500 THEN
    RAISE EXCEPTION 'Invalid reward amount: must be between ₦0.01 and ₦500.00';
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
    INSERT INTO public.wallets (user_id, available_balance, pending_balance, pending_rewards, total_earned, total_withdrawn, currency)
    VALUES (v_user_id, 0.00, 0.00, 0.00, 0.00, 0.00, 'NGN');
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

  -- 2. Create authoritative ledger entry
  INSERT INTO public.ledger_entries (
    user_id,
    type,
    entry_type,
    amount,
    running_balance,
    status,
    reference_type,
    reference_id,
    reference,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'reward',
    'reward_credit',
    p_amount,
    v_new_balance,
    'confirmed',
    'opportunity',
    p_opportunity_id,
    v_ref,
    'Reward: ' || COALESCE(p_provider, 'Partner') || ' - ' || COALESCE(p_title, 'Opportunity'),
    jsonb_build_object('opportunity_id', p_opportunity_id, 'provider', p_provider, 'session_id', p_session_id)
  );

  -- 3. In-app notification
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

  -- 4. Audit log
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

  -- 5. Process pending referral if this is the first completed reward
  SELECT * INTO v_referral FROM public.referrals
  WHERE referred_user_id = v_user_id AND status = 'pending'
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_referral.id IS NOT NULL THEN
    -- Update referral status
    UPDATE public.referrals
    SET status = 'rewarded', updated_at = now()
    WHERE id = v_referral.id;

    -- Lock referrer wallet and update balance
    SELECT available_balance INTO v_referrer_balance
    FROM public.wallets
    WHERE user_id = v_referral.referrer_id
    FOR UPDATE;

    IF v_referrer_balance IS NOT NULL THEN
      v_referrer_new_balance := v_referrer_balance + v_referral.reward_amount;
      
      UPDATE public.wallets
      SET available_balance = v_referrer_new_balance,
          total_earned = total_earned + v_referral.reward_amount,
          updated_at = now()
      WHERE user_id = v_referral.referrer_id;

      v_ref_ref := 'SE-REF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));
      
      -- Create ledger entry for referrer
      INSERT INTO public.ledger_entries (
        user_id,
        type,
        entry_type,
        amount,
        running_balance,
        status,
        reference_type,
        reference_id,
        reference,
        description,
        metadata
      ) VALUES (
        v_referral.referrer_id,
        'referral',
        'referral_bonus',
        v_referral.reward_amount,
        v_referrer_new_balance,
        'confirmed',
        'referral',
        v_referral.id::TEXT,
        v_ref_ref,
        'Referral Bonus',
        jsonb_build_object('referred_user_id', v_user_id)
      );

      -- Notify referrer
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type
      ) VALUES (
        v_referral.referrer_id,
        'Referral Bonus Credited!',
        'You earned ₦' || TO_CHAR(v_referral.reward_amount, 'FM999,999,990.00') || ' from a referral completing their first reward.',
        'referral'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward credited successfully',
    'pointsEarned', p_amount,
    'newBalance', v_new_balance,
    'transactionReference', v_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11.2 RECORD / REQUEST WITHDRAWAL (Validates balance, locks wallet, checks account status, creates pending withdrawal & debit ledger)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_account_details JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_ref TEXT;
  v_withdrawal_id UUID;
  v_min_withdrawal NUMERIC(12, 2) := 500.00;
  v_max_withdrawal NUMERIC(12, 2) := 50000.00;
  v_acc_num TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  -- 1. Check account profile status
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id OR user_id = v_user_id;
  IF v_profile.account_status = 'suspended' THEN
    RAISE EXCEPTION 'Account is suspended. Withdrawals are disabled.';
  END IF;

  -- 2. Validate amount limits
  IF p_amount < v_min_withdrawal THEN
    RAISE EXCEPTION 'Minimum withdrawal is ₦500.00';
  END IF;

  IF p_amount > v_max_withdrawal THEN
    RAISE EXCEPTION 'Maximum single withdrawal limit is ₦50,000.00';
  END IF;

  -- 3. Check pending withdrawal restriction (Max 1 active withdrawal in queue)
  IF EXISTS (
    SELECT 1 FROM public.withdrawals
    WHERE user_id = v_user_id AND status IN ('pending', 'processing', 'approved')
  ) THEN
    RAISE EXCEPTION 'You already have an active withdrawal request in queue. Please wait for completion before submitting another.';
  END IF;

  -- 4. Anti-Fraud Flag Check: Shared Bank Account Detection
  v_acc_num := COALESCE(p_account_details->>'accountNumber', p_account_details->>'account_number', p_account_details->>'walletAccountId', p_account_details->>'wallet_account_id');
  IF v_acc_num IS NOT NULL AND LENGTH(v_acc_num) >= 6 THEN
    IF EXISTS (
      SELECT 1 FROM public.withdrawals
      WHERE user_id <> v_user_id
        AND (account_details->>'accountNumber' = v_acc_num OR account_details->>'account_number' = v_acc_num OR account_details->>'walletAccountId' = v_acc_num)
    ) THEN
      INSERT INTO public.fraud_events (user_id, event_type, description, metadata)
      VALUES (
        v_user_id,
        'SUSPICIOUS_SHARED_ACCOUNT',
        'User requested payout to a bank/wallet account number used by another account',
        jsonb_build_object('account_number', v_acc_num, 'amount', p_amount)
      );
    END IF;
  END IF;

  -- 5. Lock wallet row to prevent race conditions
  SELECT available_balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance. Current balance: ₦%', COALESCE(v_current_balance, 0.00);
  END IF;

  v_new_balance := v_current_balance - p_amount;
  v_ref := 'SE-WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 6. Deduct balance immediately & reserve funds
  UPDATE public.wallets
  SET
    available_balance = v_new_balance,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 7. Create pending withdrawal record
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    currency,
    payment_method,
    account_details,
    status,
    reference,
    is_demo
  ) VALUES (
    v_user_id,
    p_amount,
    'NGN',
    COALESCE(p_payment_method, 'bank_transfer'),
    p_account_details,
    'pending',
    v_ref,
    true
  ) RETURNING id INTO v_withdrawal_id;

  -- 8. Create debit ledger entry
  INSERT INTO public.ledger_entries (
    user_id,
    type,
    entry_type,
    amount,
    running_balance,
    status,
    reference_type,
    reference_id,
    reference,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'withdrawal',
    'withdrawal_debit',
    -p_amount,
    v_new_balance,
    'pending',
    'withdrawal',
    v_withdrawal_id::TEXT,
    v_ref,
    'Payout Request (' || COALESCE(p_payment_method, 'Bank Transfer') || ') [TEST MODE]',
    jsonb_build_object('withdrawal_id', v_withdrawal_id, 'payment_method', p_payment_method)
  );

  -- 9. In-app notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_user_id,
    'Payout Request Submitted [DEMO]',
    'Your withdrawal request of ₦' || TO_CHAR(p_amount, 'FM999,999,990.00') || ' has been queued for verification (Ref: ' || v_ref || ').',
    'withdrawal'
  );

  -- 10. Audit log
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

-- Alias for record_withdrawal
CREATE OR REPLACE FUNCTION public.record_withdrawal(
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_account_details JSONB
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.request_withdrawal(p_amount, p_payment_method, p_account_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11.3 ADMIN REVIEW WITHDRAWAL (State machine transitions, refunds, & audit log)
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(
  p_withdrawal_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL,
  p_provider_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_caller_email TEXT;
  v_caller_role TEXT;
  v_withdrawal RECORD;
  v_wallet RECORD;
  v_old_status TEXT;
  v_new_balance NUMERIC(12, 2);
  v_rev_ref TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Session token required';
  END IF;

  -- Verify caller privileges
  SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id OR user_id = v_caller_id;

  IF COALESCE(v_caller_email, '') <> 'tonyanderson19880@gmail.com' AND COALESCE(v_caller_role, '') <> 'admin' THEN
    INSERT INTO public.fraud_events (user_id, event_type, description, metadata)
    VALUES (
      v_caller_id,
      'UNAUTHORIZED_ADMIN_ACTION',
      'Unauthorized user attempted to call admin_review_withdrawal RPC',
      jsonb_build_object('withdrawal_id', p_withdrawal_id, 'target_status', p_status, 'caller_email', v_caller_email)
    );
    RAISE EXCEPTION 'Forbidden: Administrator privileges required.';
  END IF;

  -- Lock withdrawal record
  SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF v_withdrawal.id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  v_old_status := v_withdrawal.status;

  -- Prevent changes from terminal states
  IF v_old_status IN ('completed', 'paid', 'rejected', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Withdrawal has already reached terminal status (%) and cannot be modified.', UPPER(v_old_status);
  END IF;

  -- Validate target status
  IF p_status NOT IN ('approved', 'processing', 'completed', 'paid', 'rejected', 'failed') THEN
    RAISE EXCEPTION 'Invalid target withdrawal status: %', p_status;
  END IF;

  -- Perform status update & wallet adjustments
  IF p_status IN ('rejected', 'failed') THEN
    -- Lock user wallet
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_withdrawal.user_id FOR UPDATE;

    v_new_balance := v_wallet.available_balance + v_withdrawal.amount;

    -- Refund balance
    UPDATE public.wallets
    SET
      available_balance = v_new_balance,
      updated_at = now()
    WHERE user_id = v_withdrawal.user_id;

    -- Update withdrawal record
    UPDATE public.withdrawals
    SET
      status = p_status,
      rejection_reason = COALESCE(p_rejection_reason, p_admin_notes, 'Request rejected by compliance'),
      admin_note = COALESCE(p_admin_notes, p_rejection_reason),
      provider_reference = COALESCE(p_provider_reference, v_withdrawal.provider_reference),
      updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Create reversal ledger entry
    v_rev_ref := 'REV-' || v_withdrawal.reference;
    INSERT INTO public.ledger_entries (
      user_id,
      type,
      entry_type,
      amount,
      running_balance,
      status,
      reference_type,
      reference_id,
      reference,
      description,
      metadata
    ) VALUES (
      v_withdrawal.user_id,
      'reversal',
      'withdrawal_refund',
      v_withdrawal.amount,
      v_new_balance,
      'confirmed',
      'withdrawal',
      v_withdrawal.id::TEXT,
      v_rev_ref,
      'Withdrawal refund reversal (' || UPPER(p_status) || '): ' || COALESCE(p_rejection_reason, 'Admin rejection'),
      jsonb_build_object('withdrawal_id', p_withdrawal_id, 'original_reference', v_withdrawal.reference)
    );

    -- Update original ledger entry status to cancelled
    UPDATE public.ledger_entries
    SET status = 'cancelled'
    WHERE reference = v_withdrawal.reference;

    -- User Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_withdrawal.user_id,
      'Withdrawal ' || UPPER(p_status) || ' [Refunded]',
      'Your withdrawal of ₦' || TO_CHAR(v_withdrawal.amount, 'FM999,999,990.00') || ' was ' || p_status || '. Funds have been refunded to your wallet. Reason: ' || COALESCE(p_rejection_reason, 'Rejected by compliance.'),
      'withdrawal'
    );

  ELSIF p_status IN ('completed', 'paid') THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_withdrawal.user_id FOR UPDATE;

    UPDATE public.wallets
    SET
      total_withdrawn = total_withdrawn + v_withdrawal.amount,
      updated_at = now()
    WHERE user_id = v_withdrawal.user_id;

    UPDATE public.withdrawals
    SET
      status = 'completed',
      admin_note = COALESCE(p_admin_notes, 'Payout verified and settled'),
      provider_reference = COALESCE(p_provider_reference, v_withdrawal.provider_reference, 'DEMO-PAY-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))),
      processed_at = now(),
      updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Mark ledger entry confirmed
    UPDATE public.ledger_entries
    SET status = 'confirmed'
    WHERE reference = v_withdrawal.reference;

    -- User Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_withdrawal.user_id,
      'Withdrawal Completed [DEMO]',
      'Your withdrawal of ₦' || TO_CHAR(v_withdrawal.amount, 'FM999,999,990.00') || ' (Ref: ' || v_withdrawal.reference || ') has been successfully processed in Demo Mode.',
      'withdrawal'
    );

  ELSIF p_status = 'processing' OR p_status = 'approved' THEN
    UPDATE public.withdrawals
    SET
      status = p_status,
      admin_note = p_admin_notes,
      provider_reference = COALESCE(p_provider_reference, v_withdrawal.provider_reference, 'DEMO-TRF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))),
      updated_at = now()
    WHERE id = p_withdrawal_id;

    -- User Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_withdrawal.user_id,
      'Withdrawal Status: ' || UPPER(p_status),
      'Your withdrawal request of ₦' || TO_CHAR(v_withdrawal.amount, 'FM999,999,990.00') || ' is now ' || p_status || '.',
      'withdrawal'
    );
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_caller_id,
    'WITHDRAWAL_REVIEW_' || UPPER(p_status),
    'withdrawals',
    p_withdrawal_id::TEXT,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_status, 'admin_email', v_caller_email, 'notes', p_admin_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal status updated to ' || p_status,
    'withdrawalId', p_withdrawal_id,
    'newStatus', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11.3 REVERSE REWARD (Reverses a reward, validates ledger entry, safely deducts balance)
CREATE OR REPLACE FUNCTION public.reverse_reward(
  p_ledger_id UUID,
  p_reason TEXT DEFAULT 'Administrative Reversal'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_ledger RECORD;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_ref TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  -- Look up target ledger entry
  SELECT * INTO v_ledger FROM public.ledger_entries
  WHERE id = p_ledger_id AND user_id = v_user_id;

  IF v_ledger.id IS NULL THEN
    RAISE EXCEPTION 'Ledger entry not found';
  END IF;

  IF v_ledger.status = 'reversed' THEN
    RAISE EXCEPTION 'Ledger entry is already reversed';
  END IF;

  IF v_ledger.amount <= 0 THEN
    RAISE EXCEPTION 'Cannot reverse a non-credit entry';
  END IF;

  -- Lock wallet
  SELECT available_balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_balance < v_ledger.amount THEN
    RAISE EXCEPTION 'Insufficient balance to perform reversal. Current: ₦%, Needed: ₦%', v_current_balance, v_ledger.amount;
  END IF;

  v_new_balance := v_current_balance - v_ledger.amount;
  v_ref := 'SE-REV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 1. Deduct balance
  UPDATE public.wallets
  SET
    available_balance = v_new_balance,
    total_earned = GREATEST(0.00, total_earned - v_ledger.amount),
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 2. Mark original entry reversed
  UPDATE public.ledger_entries
  SET status = 'reversed'
  WHERE id = p_ledger_id;

  -- 3. Create reversal ledger entry
  INSERT INTO public.ledger_entries (
    user_id,
    type,
    entry_type,
    amount,
    running_balance,
    status,
    reference_type,
    reference_id,
    reference,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'reversal',
    'withdrawal_reversal',
    -v_ledger.amount,
    v_new_balance,
    'confirmed',
    'ledger_entry',
    p_ledger_id::TEXT,
    v_ref,
    'Reversal: ' || COALESCE(p_reason, 'Reward Reversal') || ' (Original: ' || v_ledger.reference || ')',
    jsonb_build_object('original_ledger_id', p_ledger_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward reversed successfully',
    'reversedAmount', v_ledger.amount,
    'newBalance', v_new_balance,
    'reference', v_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution privileges to authenticated users
GRANT EXECUTE ON FUNCTION public.credit_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_reward TO authenticated;
