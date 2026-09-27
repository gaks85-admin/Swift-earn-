import crypto from 'crypto';
import {
  RewardedVideoProvider,
  RewardedVideoSessionParams,
  RewardedVideoSessionResult,
  RewardedVideoStatusResult,
  RewardedVideoCompletionParams,
  RewardedVideoCallbackParams,
  RewardedVideoVerificationResult,
} from '../RewardedVideoProvider.js';
import { dbManager } from '../../db.js';

/**
 * DemoRewardedVideoProvider
 *
 * DEVELOPMENT / TEST ONLY.
 *
 * SAFETY INVARIANTS:
 * 1. Explicitly marked isDemo = true.
 * 2. Production safety guard: Throws if NODE_ENV === 'production' unless explicit
 *    ALLOW_DEMO_REWARDS=true flag is explicitly configured.
 * 3. Never represents real advertising revenue.
 * 4. Respects strict server-side session checks, expiration, user ownership, daily limits,
 *    and cryptographic idempotency keys.
 * 5. Replay protection: Duplicate callback/claim attempts return idempotent results without double crediting.
 */
export class DemoRewardedVideoProvider implements RewardedVideoProvider {
  readonly providerName = 'demo_rewarded_video';
  readonly isDemo = true;

  private checkProductionSafety() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDemo = process.env.ALLOW_DEMO_REWARDS === 'true';

    if (isProduction && !allowDemo) {
      throw new Error(
        'SECURITY_VIOLATION: DemoRewardedVideoProvider is strictly disabled in production environments. Please configure a certified production rewarded-video provider.'
      );
    }
  }

  async createSession(params: RewardedVideoSessionParams): Promise<RewardedVideoSessionResult> {
    this.checkProductionSafety();

    const { userId, opportunityId, ipAddress, userAgent, metadata } = params;
    if (!userId || !opportunityId) {
      throw new Error('userId and opportunityId are required to create a rewarded video session.');
    }

    // Reuse existing authoritative reward_sessions architecture
    const result = dbManager.createRewardSession({
      userId,
      opportunityId,
      ipAddress,
      userAgent,
      provider: this.providerName,
    });

    const opp = result.opportunity;
    const rewardAmount = opp.reward_amount ?? opp.reward_points ?? 10;

    return {
      sessionId: result.session.id,
      providerSessionId: result.session.provider_session_id,
      providerName: this.providerName,
      userId,
      opportunityId,
      rewardAmount,
      currency: 'NGN',
      status: 'initiated',
      startedAt: result.session.started_at,
      expiresAt: result.session.expires_at,
      token: result.token,
      metadata: {
        isDemo: true,
        estimatedSeconds: opp.estimated_seconds || opp.estimated_duration || 30,
        ...metadata,
      },
    };
  }

  async getStatus(sessionId: string): Promise<RewardedVideoStatusResult> {
    const session = dbManager.findRewardSession(sessionId);
    if (!session) {
      throw new Error(`Reward session ${sessionId} not found.`);
    }

    const opp = dbManager.getOpportunityById(session.opportunity_id);
    const rewardAmount = opp?.reward_amount ?? opp?.reward_points ?? 10;

    return {
      sessionId: session.id,
      providerSessionId: session.provider_session_id || session.id,
      providerName: this.providerName,
      userId: session.user_id,
      status: session.status as any,
      rewardAmount,
      currency: 'NGN',
      completedAt: session.completed_at,
      claimedAt: session.claimed_at,
      providerTransactionId: (session.metadata as any)?.providerTransactionId,
      metadata: session.metadata,
    };
  }

  async verifyCompletion(params: RewardedVideoCompletionParams): Promise<RewardedVideoVerificationResult> {
    this.checkProductionSafety();

    const { sessionId, userId, providerTransactionId, idempotencyKey } = params;
    const session = dbManager.findRewardSession(sessionId);

    if (!session) {
      throw new Error(`Reward session ${sessionId} not found.`);
    }

    if (session.user_id !== userId) {
      dbManager.logFraudEvent(userId, 85, 'rewarded_video_wrong_user', {
        sessionId,
        expectedUser: session.user_id,
        attemptedUser: userId,
      });
      throw new Error('Unauthorized: Reward session does not match the active user.');
    }

    if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
      session.status = 'expired';
      throw new Error('Reward session has expired. Please launch a fresh rewarded video.');
    }

    // Idempotency: If already claimed, return existing credit safely without duplicate credit
    if (session.claimed) {
      const wallet = dbManager.getWallet(userId);
      return {
        success: true,
        sessionId: session.id,
        providerTransactionId: providerTransactionId || session.id,
        providerName: this.providerName,
        userId,
        rewardAmount: session.expected_amount || 10,
        currency: 'NGN',
        status: 'claimed',
        newBalance: wallet.available_balance,
        transactionReference: `SE-REW-${session.id.slice(-8).toUpperCase()}`,
        alreadyProcessed: true,
        message: 'Reward session has already been claimed and credited.',
      };
    }

    // Execute authoritative verify and ledger credit via dbManager
    const claimRes = dbManager.verifyRewardSession({
      sessionId,
      userId,
      idempotencyKey: idempotencyKey || `idemp_video_${sessionId}`,
    });

    const txId = providerTransactionId || `DEMO-TX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    if (!session.metadata) session.metadata = {};
    session.metadata.providerTransactionId = txId;
    session.metadata.providerName = this.providerName;

    return {
      success: true,
      sessionId: session.id,
      providerTransactionId: txId,
      providerName: this.providerName,
      userId,
      rewardAmount: claimRes.pointsEarned,
      currency: 'NGN',
      status: 'claimed',
      newBalance: claimRes.newBalance,
      transactionReference: claimRes.transactionReference,
      alreadyProcessed: false,
      message: 'Rewarded video completed and reward safely credited to wallet ledger.',
    };
  }

  async processCallback(params: RewardedVideoCallbackParams): Promise<RewardedVideoVerificationResult> {
    this.checkProductionSafety();

    const { sessionId, userId, providerTransactionId, signature, timestamp } = params;

    // Validate timestamp freshness (10 minute callback window)
    if (timestamp) {
      const tsNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
      const now = Date.now();
      if (!isNaN(tsNum) && Math.abs(now - tsNum) > 10 * 60 * 1000) {
        throw new Error('REPLAY_DETECTED: Callback timestamp expired or out of allowed window.');
      }
    }

    // Validate signature if provided
    if (signature) {
      const secret = process.env.REWARD_PROVIDER_SECRET || 'swift-earn-crypto-reward-secret-v1-production';
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${sessionId}:${userId}:${providerTransactionId}`)
        .digest('hex');

      if (signature !== expectedSig) {
        dbManager.logFraudEvent(userId, 95, 'rewarded_video_invalid_signature', {
          sessionId,
          providerTransactionId,
        });
        throw new Error('INVALID_SIGNATURE: Rewarded video callback signature verification failed.');
      }
    }

    return this.verifyCompletion({
      sessionId,
      userId,
      providerTransactionId,
      idempotencyKey: `callback_${providerTransactionId}_${sessionId}`,
    });
  }
}
