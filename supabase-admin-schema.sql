-- ====================================================================
-- SWIFT EARN ADMIN DASHBOARD & SECURITY SQL MIGRATION
-- ====================================================================
-- Run this migration in Supabase Dashboard -> SQL Editor -> New Query
-- Safe, non-destructive, and idempotent.

-- 1. Ensure 'role' and 'account_status' columns exist on public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'restricted'));

-- 2. Create System Configuration Table if not exists
CREATE TABLE IF NOT EXISTS public.system_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  minimum_withdrawal NUMERIC(12,2) DEFAULT 500.00,
  maximum_withdrawal NUMERIC(12,2) DEFAULT 50000.00,
  daily_withdrawal_limit NUMERIC(12,2) DEFAULT 100000.00,
  max_pending_withdrawals INTEGER DEFAULT 1,
  referral_reward_amount NUMERIC(12,2) DEFAULT 50.00,
  demo_mode BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.system_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- 3. Security Helper Function: is_admin()
-- Validates whether the calling authenticated Supabase user has admin or super_admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. Admin Row Level Security (RLS) Policies
-- Ensure RLS is enabled on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow admins full SELECT access to all user profiles
DROP POLICY IF EXISTS "Admins select all profiles" ON public.profiles;
CREATE POLICY "Admins select all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- Allow admins UPDATE access to user profiles
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- Allow admins SELECT access to all wallets
DROP POLICY IF EXISTS "Admins select all wallets" ON public.wallets;
CREATE POLICY "Admins select all wallets" ON public.wallets FOR SELECT USING (public.is_admin());

-- Allow admins SELECT access to all ledger entries
DROP POLICY IF EXISTS "Admins select all ledger_entries" ON public.ledger_entries;
CREATE POLICY "Admins select all ledger_entries" ON public.ledger_entries FOR SELECT USING (public.is_admin());

-- Allow admins SELECT & UPDATE access to withdrawals
DROP POLICY IF EXISTS "Admins select all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins select all withdrawals" ON public.withdrawals FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins update all withdrawals" ON public.withdrawals FOR UPDATE USING (public.is_admin());

-- Allow admins SELECT access to all reward sessions
DROP POLICY IF EXISTS "Admins select all reward_sessions" ON public.reward_sessions;
CREATE POLICY "Admins select all reward_sessions" ON public.reward_sessions FOR SELECT USING (public.is_admin());

-- Allow admins ALL access to reward opportunities
DROP POLICY IF EXISTS "Admins manage reward_opportunities" ON public.reward_opportunities;
CREATE POLICY "Admins manage reward_opportunities" ON public.reward_opportunities FOR ALL USING (public.is_admin());

-- Allow admins SELECT & UPDATE access to referrals
DROP POLICY IF EXISTS "Admins select all referrals" ON public.referrals;
CREATE POLICY "Admins select all referrals" ON public.referrals FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update all referrals" ON public.referrals;
CREATE POLICY "Admins update all referrals" ON public.referrals FOR UPDATE USING (public.is_admin());

-- Allow admins SELECT & UPDATE access to fraud events
DROP POLICY IF EXISTS "Admins select all fraud_events" ON public.fraud_events;
CREATE POLICY "Admins select all fraud_events" ON public.fraud_events FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update all fraud_events" ON public.fraud_events;
CREATE POLICY "Admins update all fraud_events" ON public.fraud_events FOR UPDATE USING (public.is_admin());

-- Allow admins SELECT & INSERT access to audit logs
DROP POLICY IF EXISTS "Admins select all audit_logs" ON public.audit_logs;
CREATE POLICY "Admins select all audit_logs" ON public.audit_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_admin());

-- Allow admins SELECT & UPDATE access to system config
DROP POLICY IF EXISTS "Admins select system_config" ON public.system_config;
CREATE POLICY "Admins select system_config" ON public.system_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update system_config" ON public.system_config;
CREATE POLICY "Admins update system_config" ON public.system_config FOR UPDATE USING (public.is_admin());

-- 5. RPC: admin_review_withdrawal
-- Atomically approve or reject a pending withdrawal with full server-side authorization and wallet refund on rejection/failure.
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(
  p_withdrawal_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_withdrawal RECORD;
  v_wallet RECORD;
  v_idempotency_key TEXT;
  v_admin_id UUID := auth.uid();
BEGIN
  -- Strict Server-Side Admin Role Verification
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required';
  END IF;

  -- Validate requested status
  IF p_status NOT IN ('approved', 'completed', 'rejected', 'failed', 'processing') THEN
    RAISE EXCEPTION 'Invalid withdrawal status: %', p_status;
  END IF;

  -- Lock withdrawal row
  SELECT * INTO v_withdrawal
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- If status is already finalized, prevent duplicate processing
  IF v_withdrawal.status IN ('completed', 'approved', 'rejected', 'failed') AND p_status = v_withdrawal.status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Withdrawal already in requested status', 'status', v_withdrawal.status);
  END IF;

  -- Handle Refund on Rejection / Failure
  IF p_status IN ('rejected', 'failed') AND v_withdrawal.status IN ('pending', 'processing') THEN
    -- Lock user wallet
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_withdrawal.user_id
    FOR UPDATE;

    IF v_wallet IS NOT NULL THEN
      -- Refund available balance and update locked balance
      UPDATE public.wallets
      SET available_balance = available_balance + v_withdrawal.amount,
          locked_balance = GREATEST(0, locked_balance - v_withdrawal.amount),
          updated_at = timezone('utc'::text, now())
      WHERE user_id = v_withdrawal.user_id;

      -- Record Reversal Ledger Entry
      v_idempotency_key := 'reversal_wth_' || v_withdrawal.id::text;
      
      INSERT INTO public.ledger_entries (
        user_id,
        entry_type,
        amount,
        balance_after,
        reference,
        description,
        idempotency_key
      ) VALUES (
        v_withdrawal.user_id,
        'reversal',
        v_withdrawal.amount,
        v_wallet.available_balance + v_withdrawal.amount,
        v_withdrawal.reference,
        COALESCE(p_rejection_reason, 'Withdrawal rejected - balance refunded to wallet'),
        v_idempotency_key
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      -- Create User Notification
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type
      ) VALUES (
        v_withdrawal.user_id,
        'Withdrawal Refunded',
        'Your withdrawal of ₦' || v_withdrawal.amount || ' was ' || p_status || '. Funds have been refunded to your wallet balance.',
        'withdrawal'
      );
    END IF;
  END IF;

  -- Update Withdrawal Record
  UPDATE public.withdrawals
  SET status = CASE WHEN p_status = 'approved' THEN 'completed' ELSE p_status END,
      rejection_reason = p_rejection_reason,
      admin_note = p_admin_notes,
      processed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_withdrawal_id;

  -- Log Audit Action
  INSERT INTO public.audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    v_admin_id,
    CASE WHEN p_status IN ('approved', 'completed') THEN 'withdrawal_approved' ELSE 'withdrawal_rejected' END,
    'withdrawal',
    p_withdrawal_id::text,
    jsonb_build_object(
      'amount', v_withdrawal.amount,
      'user_id', v_withdrawal.user_id,
      'status', p_status,
      'reason', p_rejection_reason,
      'note', p_admin_notes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'status', p_status,
    'refunded', (p_status IN ('rejected', 'failed'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 6. RPC: admin_update_user_status
-- Suspend or unsuspend user accounts with strict authorization and audit logging.
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
  p_target_user_id UUID,
  p_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required';
  END IF;

  IF p_status NOT IN ('active', 'suspended', 'restricted') THEN
    RAISE EXCEPTION 'Invalid account status: %', p_status;
  END IF;

  UPDATE public.profiles
  SET account_status = p_status,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_target_user_id;

  -- Log Audit
  INSERT INTO public.audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    v_admin_id,
    CASE WHEN p_status = 'suspended' THEN 'user_suspended' ELSE 'user_unsuspended' END,
    'user',
    p_target_user_id::text,
    jsonb_build_object('status', p_status)
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_target_user_id, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_update_user_status(UUID, TEXT) TO authenticated;

-- 7. RPC: admin_resolve_fraud_event
CREATE OR REPLACE FUNCTION public.admin_resolve_fraud_event(
  p_event_id UUID,
  p_resolution TEXT,
  p_resolved BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required';
  END IF;

  UPDATE public.fraud_events
  SET description = description || ' [Resolution: ' || COALESCE(p_resolution, 'Resolved by Admin') || ']',
      created_at = created_at
  WHERE id = p_event_id;

  INSERT INTO public.audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    v_admin_id,
    'fraud_event_resolved',
    'fraud_event',
    p_event_id::text,
    jsonb_build_object('resolution', p_resolution, 'resolved', p_resolved)
  );

  RETURN jsonb_build_object('success', true, 'event_id', p_event_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_resolve_fraud_event(UUID, TEXT, BOOLEAN) TO authenticated;

-- 8. RPC: admin_update_platform_settings
CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(
  p_settings JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required';
  END IF;

  UPDATE public.system_config
  SET minimum_withdrawal = COALESCE((p_settings->>'minimum_withdrawal')::numeric, minimum_withdrawal),
      maximum_withdrawal = COALESCE((p_settings->>'maximum_withdrawal')::numeric, maximum_withdrawal),
      daily_withdrawal_limit = COALESCE((p_settings->>'daily_withdrawal_limit')::numeric, daily_withdrawal_limit),
      max_pending_withdrawals = COALESCE((p_settings->>'max_pending_withdrawals')::integer, max_pending_withdrawals),
      referral_reward_amount = COALESCE((p_settings->>'referral_reward_amount')::numeric, referral_reward_amount),
      demo_mode = COALESCE((p_settings->>'demo_mode')::boolean, demo_mode),
      updated_at = timezone('utc'::text, now())
  WHERE id = 'default';

  INSERT INTO public.audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    v_admin_id,
    'platform_setting_changed',
    'system_config',
    'default',
    p_settings
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_update_platform_settings(JSONB) TO authenticated;

-- Helper to make your user account a super_admin in Supabase:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'admin@swiftearn.com';
