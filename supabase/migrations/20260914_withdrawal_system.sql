-- ==============================================================================
-- SWIFT EARN - COMPLETE WITHDRAWAL SYSTEM & DEMO SETTLEMENT MIGRATION
-- Compatible with Supabase PostgreSQL & Row Level Security (RLS)
-- ==============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Update/Create WITHDRAWALS table
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

-- Ensure all required columns exist if table was previously created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'currency') THEN
    ALTER TABLE public.withdrawals ADD COLUMN currency TEXT DEFAULT 'NGN' NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'account_name') THEN
    ALTER TABLE public.withdrawals ADD COLUMN account_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'account_number') THEN
    ALTER TABLE public.withdrawals ADD COLUMN account_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'bank_name') THEN
    ALTER TABLE public.withdrawals ADD COLUMN bank_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'admin_note') THEN
    ALTER TABLE public.withdrawals ADD COLUMN admin_note TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'rejection_reason') THEN
    ALTER TABLE public.withdrawals ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'is_demo') THEN
    ALTER TABLE public.withdrawals ADD COLUMN is_demo BOOLEAN DEFAULT true NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'processed_at') THEN
    ALTER TABLE public.withdrawals ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Required Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reference ON public.withdrawals(reference);

-- 4. Row Level Security Policies
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users cannot directly modify withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users cannot directly insert withdrawals" ON public.withdrawals;

-- 5. ATOMIC WITHDRAWAL REQUEST RPC
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
  v_new_available NUMERIC(12, 2);
  v_ref TEXT;
  v_withdrawal_id UUID;
  v_min_withdrawal NUMERIC(12, 2) := 500.00;
  v_max_withdrawal NUMERIC(12, 2) := 50000.00;
  v_pending_count INT;
  v_acc_name TEXT;
  v_acc_num TEXT;
  v_bank_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User authentication required';
  END IF;

  -- 1. Check account profile status
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id OR user_id = v_user_id LIMIT 1;
  IF v_profile.account_status = 'suspended' OR v_profile.account_status = 'flagged' THEN
    RAISE EXCEPTION 'Account is currently restricted. Please contact support.';
  END IF;

  -- 2. Validate amount boundaries
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero.';
  END IF;
  IF p_amount < v_min_withdrawal THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is ₦%', v_min_withdrawal;
  END IF;
  IF p_amount > v_max_withdrawal THEN
    RAISE EXCEPTION 'Maximum withdrawal amount per request is ₦%', v_max_withdrawal;
  END IF;

  -- 3. Check for conflicting pending withdrawals (Max 1 pending request at a time)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.withdrawals
  WHERE user_id = v_user_id AND status IN ('pending', 'processing');

  IF v_pending_count >= 1 THEN
    RAISE EXCEPTION 'You already have an active withdrawal request in queue. Please wait for it to conclude.';
  END IF;

  -- 4. Parse account fields
  v_acc_name := COALESCE(p_account_details->>'account_name', p_account_details->>'accountName', '');
  v_acc_num := COALESCE(p_account_details->>'account_number', p_account_details->>'accountNumber', p_account_details->>'wallet_account_id', p_account_details->>'walletAccountId', '');
  v_bank_name := COALESCE(p_account_details->>'bank_name', p_account_details->>'bankName', p_account_details->>'wallet_provider', p_account_details->>'walletProvider', 'Bank');

  IF LENGTH(TRIM(v_acc_num)) < 10 THEN
    RAISE EXCEPTION 'Account number or phone ID must be at least 10 digits.';
  END IF;
  IF LENGTH(TRIM(v_acc_name)) = 0 THEN
    RAISE EXCEPTION 'Account holder name is required.';
  END IF;

  -- 5. Lock wallet row FOR UPDATE (prevents double-spend and concurrent requests)
  SELECT available_balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient confirmed balance. Available: ₦%', COALESCE(v_current_balance, 0.00);
  END IF;

  v_new_available := v_current_balance - p_amount;
  v_ref := 'SE-WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 6. Atomically update wallet: deduct available balance, add to pending_balance
  UPDATE public.wallets
  SET
    available_balance = v_new_available,
    pending_balance = pending_balance + p_amount,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 7. Insert withdrawal record (explicitly tagged as is_demo = true)
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    currency,
    payment_method,
    account_name,
    account_number,
    bank_name,
    account_details,
    status,
    reference,
    is_demo
  ) VALUES (
    v_user_id,
    p_amount,
    'NGN',
    COALESCE(p_payment_method, 'bank_transfer'),
    v_acc_name,
    v_acc_num,
    v_bank_name,
    p_account_details,
    'pending',
    v_ref,
    true
  ) RETURNING id INTO v_withdrawal_id;

  -- 8. Insert ledger entry for immutable audit trail
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
    'withdrawal',
    'withdrawal_debit',
    -p_amount,
    v_new_available,
    'pending',
    'withdrawal',
    v_withdrawal_id::TEXT,
    v_ref,
    'Payout Request (' || v_bank_name || ' - ' || v_acc_name || ') [DEMO]',
    'idemp_wth_' || v_withdrawal_id::TEXT,
    jsonb_build_object(
      'withdrawal_id', v_withdrawal_id,
      'payment_method', p_payment_method,
      'bank_name', v_bank_name,
      'is_demo', true
    )
  );

  -- 9. In-app notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_user_id,
    'Withdrawal Request Submitted',
    'Your request for ₦' || TO_CHAR(p_amount, 'FM999,999,990.00') || ' via ' || v_bank_name || ' is pending processing (Ref: ' || v_ref || ').',
    'withdrawal'
  );

  -- 10. Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    'WITHDRAWAL_REQUEST_CREATED',
    'withdrawals',
    v_withdrawal_id::TEXT,
    jsonb_build_object(
      'amount', p_amount,
      'reference', v_ref,
      'available_balance_after', v_new_available,
      'is_demo', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request submitted successfully (DEMO TEST MODE).',
    'reference', v_ref,
    'withdrawalId', v_withdrawal_id,
    'newAvailableBalance', v_new_available,
    'isDemo', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. ADMIN WITHDRAWAL STATUS UPDATE RPC
CREATE OR REPLACE FUNCTION public.admin_update_withdrawal_status(
  p_withdrawal_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_w RECORD;
  v_wallet RECORD;
  v_ref_rev TEXT;
BEGIN
  -- Find withdrawal
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF v_w.id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_w.status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Status unchanged', 'status', v_w.status);
  END IF;

  IF v_w.status IN ('completed', 'rejected', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot modify a finalized withdrawal (status: %)', v_w.status;
  END IF;

  IF p_new_status = 'rejected' AND (p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) = 0) THEN
    RAISE EXCEPTION 'Rejection reason is required when rejecting a withdrawal request.';
  END IF;

  -- 1. Handling transition to PROCESSING
  IF p_new_status = 'processing' THEN
    UPDATE public.withdrawals
    SET status = 'processing', admin_note = p_note, updated_at = now()
    WHERE id = p_withdrawal_id;

    RETURN jsonb_build_object('success', true, 'status', 'processing', 'message', 'Withdrawal moved to processing.');

  -- 2. Handling transition to COMPLETED (TEST/DEMO MODE ONLY)
  ELSIF p_new_status = 'completed' THEN
    -- Complete wallet balances
    UPDATE public.wallets
    SET
      pending_balance = GREATEST(0.00, pending_balance - v_w.amount),
      total_withdrawn = total_withdrawn + v_w.amount,
      updated_at = now()
    WHERE user_id = v_w.user_id;

    -- Update withdrawal
    UPDATE public.withdrawals
    SET
      status = 'completed',
      admin_note = p_note,
      processed_at = now(),
      updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Update debit ledger entry status to confirmed
    UPDATE public.ledger_entries
    SET status = 'confirmed'
    WHERE reference = v_w.reference;

    -- Notification
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      v_w.user_id,
      'Withdrawal Completed [DEMO]',
      'Your simulated withdrawal of ₦' || TO_CHAR(v_w.amount, 'FM999,999,990.00') || ' has been marked completed in demo mode.',
      'withdrawal'
    );

    RETURN jsonb_build_object('success', true, 'status', 'completed', 'message', 'Withdrawal marked completed in demo mode.');

  -- 3. Handling transition to REJECTED or FAILED (Full refund via ledger reversal)
  ELSIF p_new_status IN ('rejected', 'failed') THEN
    -- Return reserved funds to user's available balance
    UPDATE public.wallets
    SET
      available_balance = available_balance + v_w.amount,
      pending_balance = GREATEST(0.00, pending_balance - v_w.amount),
      updated_at = now()
    WHERE user_id = v_w.user_id;

    -- Mark original debit entry as cancelled/reversed
    UPDATE public.ledger_entries
    SET status = 'cancelled'
    WHERE reference = v_w.reference;

    v_ref_rev := 'SE-REV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

    -- Insert Reversal Ledger Entry
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
      v_w.user_id,
      'reversal',
      'withdrawal_reversal',
      v_w.amount,
      (SELECT available_balance FROM public.wallets WHERE user_id = v_w.user_id),
      'confirmed',
      'withdrawal',
      v_w.id::TEXT,
      v_ref_rev,
      'Withdrawal Reversal (' || p_new_status || '): ' || COALESCE(p_rejection_reason, p_note, 'Payment verification failed'),
      'idemp_rev_' || v_w.id::TEXT,
      jsonb_build_object('withdrawal_id', v_w.id, 'original_reference', v_w.reference, 'reason', p_rejection_reason)
    );

    -- Update withdrawal record
    UPDATE public.withdrawals
    SET
      status = p_new_status,
      admin_note = p_note,
      rejection_reason = p_rejection_reason,
      updated_at = now()
    WHERE id = p_withdrawal_id;

    -- In-app notification
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      v_w.user_id,
      'Withdrawal ' || UPPER(p_new_status),
      'Your withdrawal of ₦' || TO_CHAR(v_w.amount, 'FM999,999,990.00') || ' was ' || p_new_status || '. ₦' || TO_CHAR(v_w.amount, 'FM999,999,990.00') || ' has been returned to your available balance. Reason: ' || COALESCE(p_rejection_reason, 'Verification issue'),
      'withdrawal'
    );

    RETURN jsonb_build_object('success', true, 'status', p_new_status, 'message', 'Withdrawal ' || p_new_status || ' and funds returned to user wallet.');
  ELSE
    RAISE EXCEPTION 'Unsupported status transition: %', p_new_status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution
GRANT EXECUTE ON FUNCTION public.request_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal_status TO authenticated;
