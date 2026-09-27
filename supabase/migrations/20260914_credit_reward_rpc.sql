-- ==============================================================================
-- SWIFT EARN - CREDIT REWARD RPC MIGRATION
-- Secure, idempotent PostgreSQL function for crediting verified reward sessions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.credit_reward(
  p_amount NUMERIC,
  p_opportunity_id TEXT,
  p_provider TEXT,
  p_session_id UUID,
  p_title TEXT
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
  v_trusted_amount NUMERIC(12, 2);
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  -- 2. Validate reward session exists
  SELECT * INTO v_session FROM public.reward_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    INSERT INTO public.fraud_events (user_id, session_id, event_type, description)
    VALUES (v_user_id, p_session_id, 'INVALID_SESSION_CLAIM_ATTEMPT', 'Claim attempted for non-existent session');
    RAISE EXCEPTION 'Reward session not found';
  END IF;

  -- 3. Verify session belongs to authenticated user
  IF v_session.user_id <> v_user_id THEN
    INSERT INTO public.fraud_events (user_id, session_id, event_type, description, metadata)
    VALUES (v_user_id, p_session_id, 'CROSS_USER_SESSION_THEFT', 'Attempted to claim a session belonging to another user', jsonb_build_object('actual_owner', v_session.user_id));
    RAISE EXCEPTION 'Unauthorized: This reward session belongs to another account';
  END IF;

  -- 4. Check if session already completed / credited
  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'Reward session has already been completed';
  END IF;

  IF v_session.status IN ('rejected', 'failed', 'expired') THEN
    RAISE EXCEPTION 'Reward session was invalidated, expired, or rejected';
  END IF;

  -- 5. Validate reward opportunity exists
  SELECT * INTO v_opp FROM public.reward_opportunities
  WHERE id = p_opportunity_id;

  IF v_opp.id IS NULL THEN
    RAISE EXCEPTION 'Reward opportunity not found';
  END IF;

  -- 6. Expiration check
  IF v_session.expires_at < now() THEN
    UPDATE public.reward_sessions SET status = 'expired' WHERE id = p_session_id;
    RAISE EXCEPTION 'Reward session expired';
  END IF;

  -- 7. Trusted amount validation (Prevent client manipulation of p_amount)
  v_trusted_amount := COALESCE(v_opp.reward_amount, v_session.reward_amount, p_amount);
  IF v_trusted_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid reward amount';
  END IF;

  -- 8. Idempotency / Duplicate protection
  v_idemp_key := 'idemp_ses_' || p_session_id::TEXT;
  SELECT * INTO v_existing_ledger FROM public.ledger_entries
  WHERE idempotency_key = v_idemp_key OR (reference_type = 'reward_session' AND reference_id = p_session_id::TEXT);

  IF v_existing_ledger.id IS NOT NULL THEN
    SELECT available_balance INTO v_current_balance FROM public.wallets WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Reward already credited',
      'pointsEarned', v_existing_ledger.amount,
      'newBalance', COALESCE(v_current_balance, 0.00),
      'transactionReference', v_existing_ledger.reference,
      'sessionId', p_session_id
    );
  END IF;

  -- 9. Lock user wallet FOR UPDATE
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

  v_new_balance := v_current_balance + v_trusted_amount;
  v_new_total_earned := v_new_total_earned + v_trusted_amount;
  v_ref := 'SE-REW-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 10));

  -- 10. Atomic Execution: Update session, update wallet, insert ledger, notification, audit log
  UPDATE public.reward_sessions
  SET status = 'completed',
      completed_at = now(),
      idempotency_key = v_idemp_key
  WHERE id = p_session_id;

  UPDATE public.wallets
  SET available_balance = v_new_balance,
      total_earned = v_new_total_earned,
      updated_at = now()
  WHERE user_id = v_user_id;

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
    v_trusted_amount,
    v_new_balance,
    'confirmed',
    'reward_session',
    p_session_id::TEXT,
    v_ref,
    'Verified demo reward: ' || COALESCE(p_title, v_opp.name, 'Demo Rewarded Task'),
    v_idemp_key,
    jsonb_build_object(
      'session_id', p_session_id,
      'opportunity_id', p_opportunity_id,
      'provider', COALESCE(p_provider, v_opp.provider),
      'is_demo', true
    )
  );

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_user_id,
    'Reward Confirmed!',
    'You earned +' || TO_CHAR(v_trusted_amount, 'FM999,990.00') || ' points for completing ' || COALESCE(p_title, v_opp.name, 'Demo Task') || '.',
    'reward'
  );

  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    'CREDIT_REWARD_SUCCESS',
    'reward_sessions',
    p_session_id::TEXT,
    jsonb_build_object(
      'amount', v_trusted_amount,
      'reference', v_ref,
      'new_balance', v_new_balance
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward confirmed!',
    'pointsEarned', v_trusted_amount,
    'newBalance', v_new_balance,
    'transactionReference', v_ref,
    'sessionId', p_session_id,
    'providerTransactionId', COALESCE(v_session.provider_session_id, v_ref)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.credit_reward TO authenticated;
