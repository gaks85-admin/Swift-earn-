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
 * MonetagRewardedVideoProvider
 *
 * Implements the official RewardedVideoProvider interface for Monetag.
 *
 * SAFETY INVARIANTS:
 * 1. Marked isDemo = false.
 * 2. Client video completion reports status but does NOT directly credit the wallet ledger.
 * 3. Financial reward confirmation remains pending until authoritative Monetag verification
 *    mechanism / server-to-server postback is configured.
 */
export class MonetagRewardedVideoProvider implements RewardedVideoProvider {
  readonly providerName = 'monetag';
  readonly isDemo = false;

  async createSession(params: RewardedVideoSessionParams): Promise<RewardedVideoSessionResult> {
    const { userId, opportunityId, ipAddress, userAgent, metadata } = params;
    if (!userId || !opportunityId) {
      throw new Error('userId and opportunityId are required to create a rewarded video session.');
    }

    const result = dbManager.createRewardSession({
      userId,
      opportunityId,
      ipAddress,
      userAgent,
      provider: this.providerName,
    });

    const opp = result.opportunity;
    const rewardAmount = opp.reward_amount ?? opp.reward_points ?? 10;
    const zoneId = process.env.MONETAG_ZONE_ID || 'placeholder_monetag_zone';

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
        monetagZoneId: zoneId,
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
    const { sessionId, userId, providerTransactionId } = params;
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

    // Since Monetag integration requires authoritative server-to-server postback / webhook verification,
    // financial reward confirmation is kept pending / disabled until authoritative Monetag server verification is established.
    return {
      success: false,
      sessionId: session.id,
      providerTransactionId: providerTransactionId || session.id,
      providerName: this.providerName,
      userId,
      rewardAmount: session.expected_amount || 10,
      currency: 'NGN',
      status: session.status as any,
      alreadyProcessed: false,
      message: 'Video playback completed successfully. Awaiting authoritative Monetag server-side verification postback to confirm reward.',
      error: 'SERVER_VERIFICATION_PENDING',
    };
  }

  async processCallback(params: RewardedVideoCallbackParams): Promise<RewardedVideoVerificationResult> {
    const { sessionId, userId, providerTransactionId } = params;
    const session = dbManager.findRewardSession(sessionId);

    if (!session) {
      throw new Error(`Reward session ${sessionId} not found.`);
    }

    const claimRes = dbManager.verifyRewardSession({
      sessionId,
      userId,
      idempotencyKey: `monetag_cb_${providerTransactionId || sessionId}`,
    });

    return {
      success: true,
      sessionId: session.id,
      providerTransactionId: providerTransactionId || `MONETAG-TX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      providerName: this.providerName,
      userId,
      rewardAmount: claimRes.pointsEarned,
      currency: 'NGN',
      status: 'claimed',
      newBalance: claimRes.newBalance,
      transactionReference: claimRes.transactionReference,
      alreadyProcessed: false,
      message: 'Monetag rewarded video successfully verified and credited via server-to-server postback.',
    };
  }
}
