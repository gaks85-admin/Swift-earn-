-- ==============================================================================
-- SWIFT EARN - COMPLETE REWARD ENGINE MIGRATION
-- Robust, server-authoritative, idempotent demo reward engine with fraud logging
-- ==============================================================================

-- 1. Create or Update reward_opportunities table
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

-- 2. Create or Update reward_sessions table
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

-- Ensure reward_sessions columns exist if migrating
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_sessions' AND column_name = 'opportunity_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_sessions' AND column_name = 'reward_opportunity_id') THEN
      ALTER TABLE public.reward_sessions RENAME COLUMN reward_opportunity_id TO opportunity_id;
    ELSE
      ALTER TABLE public.reward_sessions ADD COLUMN opportunity_id TEXT;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_sessions' AND column_name = 'reward_amount') THEN
    ALTER TABLE public.reward_sessions ADD COLUMN reward_amount NUMERIC(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_sessions' AND column_name = 'idempotency_key') THEN
    ALTER TABLE public.reward_sessions ADD COLUMN idempotency_key TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_sessions' AND column_name = 'provider_session_id') THEN
    ALTER TABLE public.reward_sessions ADD COLUMN provider_session_id TEXT;
  END IF;
END $$;

-- 3. Create fraud_events table
CREATE TABLE IF NOT EXISTS public.fraud_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reward_sessions_user ON public.reward_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_sessions_opp ON public.reward_sessions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_reward_sessions_created ON public.reward_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_events_user ON public.fraud_events(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_events_created ON public.fraud_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.reward_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view active reward opportunities" ON public.reward_opportunities;
CREATE POLICY "Public can view active reward opportunities"
  ON public.reward_opportunities FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Users can view own reward sessions" ON public.reward_sessions;
CREATE POLICY "Users can view own reward sessions"
  ON public.reward_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Secure RPC Function: start_reward_session
CREATE OR REPLACE FUNCTION public.start_reward_session(
  p_opportunity_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_opp RECORD;
  v_today_start TIMESTAMPTZ;
  v_today_completed_count INTEGER;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_provider_session_id TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  -- 1. Find opportunity
  SELECT * INTO v_opp FROM public.reward_opportunities
  WHERE id = p_opportunity_id AND status = 'active';

  IF v_opp.id IS NULL THEN
    RAISE EXCEPTION 'Reward opportunity not found or inactive';
  END IF;

  -- 2. Daily limit check (Server Enforced)
  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  
  SELECT COUNT(*) INTO v_today_completed_count
  FROM public.reward_sessions
  WHERE user_id = v_user_id
    AND opportunity_id = p_opportunity_id
    AND status = 'completed'
    AND started_at >= v_today_start;

  IF v_today_completed_count >= v_opp.daily_limit THEN
    RAISE EXCEPTION 'Daily limit reached for this reward (maximum % per day)', v_opp.daily_limit;
  END IF;

  -- 3. Expiration window (15 minutes)
  v_session_id := gen_random_uuid();
  v_expires_at := now() + INTERVAL '15 minutes';
  v_provider_session_id := 'DEMO-PS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 8));

  -- 4. Create session with server-defined reward amount
  INSERT INTO public.reward_sessions (
    id,
    user_id,
    opportunity_id,
    status,
    started_at,
    expires_at,
    provider,
    provider_session_id,
    reward_amount,
    metadata
  ) VALUES (
    v_session_id,
    v_user_id,
    p_opportunity_id,
    'started',
    now(),
    v_expires_at,
    v_opp.provider,
    v_provider_session_id,
    v_opp.reward_amount,
    jsonb_build_object(
      'opportunity_name', v_opp.name,
      'estimated_duration', v_opp.estimated_duration
    )
  );

  RETURN jsonb_build_object(
    'id', v_session_id,
    'user_id', v_user_id,
    'opportunity_id', p_opportunity_id,
    'status', 'started',
    'started_at', now(),
    'expires_at', v_expires_at,
    'provider', v_opp.provider,
    'provider_session_id', v_provider_session_id,
    'reward_amount', v_opp.reward_amount,
    'estimated_duration', v_opp.estimated_duration,
    'opportunity', jsonb_build_object(
      'id', v_opp.id,
      'name', v_opp.name,
      'reward_amount', v_opp.reward_amount,
      'estimated_duration', v_opp.estimated_duration,
      'provider', v_opp.provider
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Secure RPC Function: verify_and_claim_reward
CREATE OR REPLACE FUNCTION public.verify_and_claim_reward(
  p_session_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_opp RECORD;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_new_total_earned NUMERIC(12, 2);
  v_ref TEXT;
  v_idemp_key TEXT;
  v_existing_ledger RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  -- Default idempotency key
  v_idemp_key := COALESCE(p_idempotency_key, 'idemp_ses_' || p_session_id::TEXT);

  -- 1. Check if already credited via idempotency key
  SELECT * INTO v_existing_ledger FROM public.ledger_entries
  WHERE idempotency_key = v_idemp_key OR (reference_type = 'reward_session' AND reference_id = p_session_id::TEXT);

  IF v_existing_ledger.id IS NOT NULL THEN
    -- Already credited! Return existing confirmation safely without double credit
    SELECT available_balance INTO v_current_balance FROM public.wallets WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Reward already confirmed (idempotent)',
      'pointsEarned', v_existing_ledger.amount,
      'newBalance', COALESCE(v_current_balance, 0.00),
      'transactionReference', v_existing_ledger.reference,
      'sessionId', p_session_id
    );
  END IF;

  -- 2. Lock and fetch reward session
  SELECT * INTO v_session FROM public.reward_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    -- Fraud check: user passed non-existent session
    INSERT INTO public.fraud_events (user_id, session_id, event_type, description)
    VALUES (v_user_id, p_session_id, 'INVALID_SESSION_CLAIM_ATTEMPT', 'Claim attempted for non-existent session');
    RAISE EXCEPTION 'Reward session not found';
  END IF;

  -- 3. Verify ownership
  IF v_session.user_id <> v_user_id THEN
    -- Fraud check: User tried to claim another user's session!
    INSERT INTO public.fraud_events (user_id, session_id, event_type, description, metadata)
    VALUES (v_user_id, p_session_id, 'CROSS_USER_SESSION_THEFT', 'Attempted to claim a session belonging to another user', jsonb_build_object('actual_owner', v_session.user_id));
    RAISE EXCEPTION 'Unauthorized: This reward session belongs to another account';
  END IF;

  -- 4. Check already completed
  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'Reward session has already been completed';
  END IF;

  IF v_session.status IN ('rejected', 'failed') THEN
    RAISE EXCEPTION 'Reward session was invalidated or rejected';
  END IF;

  -- 5. Check expiration
  IF v_session.expires_at < now() THEN
    UPDATE public.reward_sessions SET status = 'expired' WHERE id = p_session_id;
    RAISE EXCEPTION 'Reward session has expired. Please start a fresh task.';
  END IF;

  -- 6. Fetch opportunity details for metadata & description
  SELECT * INTO v_opp FROM public.reward_opportunities
  WHERE id = v_session.opportunity_id;

  -- 7. Lock wallet row FOR UPDATE
  SELECT available_balance, total_earned INTO v_current_balance, v_new_total_earned
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO public.wallets (user_id, available_balance, pending_balance, pending_rewards, total_earned, total_withdrawn, currency)
    VALUES (v_user_id, 0.00, 0.00, 0.00, 0.00, 0.00, 'NGN');
    v_current_balance := 0.00;
    v_new_total_earned := 0.00;
  END IF;

  v_new_balance := v_current_balance + v_session.reward_amount;
  v_new_total_earned := v_new_total_earned + v_session.reward_amount;
  v_ref := 'SE-REW-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 8. Mark session completed atomically
  UPDATE public.reward_sessions
  SET status = 'completed',
      completed_at = now(),
      idempotency_key = v_idemp_key
  WHERE id = p_session_id;

  -- 9. Update wallet balances
  UPDATE public.wallets
  SET available_balance = v_new_balance,
      total_earned = v_new_total_earned,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- 10. Record immutable ledger entry
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
    idempotency_key,
    metadata
  ) VALUES (
    v_user_id,
    'reward',
    'reward_credit',
    v_session.reward_amount,
    v_new_balance,
    'confirmed',
    'reward_session',
    p_session_id::TEXT,
    v_ref,
    'Verified demo reward: ' || COALESCE(v_opp.name, 'Demo Rewarded Task'),
    v_idemp_key,
    jsonb_build_object(
      'session_id', p_session_id,
      'opportunity_id', v_session.opportunity_id,
      'provider', v_session.provider,
      'is_demo', true
    )
  );

  -- 11. Notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_user_id,
    'Demo Reward Credited!',
    'You earned +' || TO_CHAR(v_session.reward_amount, 'FM999,990.00') || ' points for completing ' || COALESCE(v_opp.name, 'Demo Task') || '.',
    'reward'
  );

  -- 12. Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    'DEMO_REWARD_CLAIMED',
    'reward_sessions',
    p_session_id::TEXT,
    jsonb_build_object(
      'amount', v_session.reward_amount,
      'reference', v_ref,
      'new_balance', v_new_balance
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Demo reward credited successfully!',
    'pointsEarned', v_session.reward_amount,
    'newBalance', v_new_balance,
    'transactionReference', v_ref,
    'sessionId', p_session_id,
    'providerTransactionId', COALESCE(v_session.provider_session_id, v_ref)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.start_reward_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_claim_reward TO authenticated;
