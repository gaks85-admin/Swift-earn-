import {
  IRewardProvider,
  RewardOpportunityItem,
  RewardSessionItem,
  RewardClaimResult,
  RewardSessionStatus,
} from './RewardProvider';
import { api } from '../../api';
import { supabaseDatabase, isSupabaseConfigured } from '../supabase';

/**
 * DemoRewardProvider
 * 
 * Simulates rewarded task interactions in a clearly labeled DEMO environment.
 * IMPORTANT:
 * - Demo rewards do NOT represent real advertising revenue.
 * - The browser is NEVER trusted to award points directly.
 * - All sessions, countdowns, idempotency keys, and wallet credits are verified server-side.
 */
export class DemoRewardProvider implements IRewardProvider {
  readonly name = 'Demo';
  readonly isDemo = true;

  /**
   * Request the server to initialize a reward session.
   * Server determines the reward amount and expiration from the database.
   */
  async createSession(opportunityId: string): Promise<RewardSessionItem> {
    if (!opportunityId) {
      throw new Error('Opportunity ID is required to start a reward session.');
    }

    if (isSupabaseConfigured()) {
      try {
        const session = await supabaseDatabase.startRewardSession(opportunityId);
        return session;
      } catch (err: any) {
        // Fallback to Express backend if Supabase direct fails
        console.warn('Supabase startRewardSession failed, attempting API fallback:', err);
      }
    }

    // Call Express API
    const res = await api.startRewardSession(opportunityId);
    return {
      id: res.sessionId,
      user_id: (res as any).userId || '',
      opportunity_id: res.opportunity?.id || opportunityId,
      status: 'started',
      started_at: res.startedAt || new Date().toISOString(),
      expires_at: res.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      provider: 'Demo',
      provider_session_id: res.providerSessionId,
      reward_amount: res.opportunity?.reward_amount ?? res.opportunity?.rewardPoints ?? 10,
      metadata: {
        token: res.token,
        estimatedSeconds: res.opportunity?.estimated_duration ?? res.opportunity?.estimatedSeconds ?? 30,
      },
    };
  }

  /**
   * Requests server-side verification and atomic crediting.
   * Checks:
   * 1. User is authenticated
   * 2. Session exists & belongs to user
   * 3. Session has not already been completed
   * 4. Session has not expired
   * 5. Daily limits are not exceeded
   * 6. Idempotency guarantees single credit
   */
  async verifyCompletion(
    sessionId: string,
    idempotencyKey?: string,
    elapsedSeconds?: number
  ): Promise<RewardClaimResult> {
    if (!sessionId) {
      throw new Error('Session ID is required for reward verification.');
    }

    const uniqueIdempKey = idempotencyKey || `idemp_ses_${sessionId}_${Date.now()}`;

    if (isSupabaseConfigured()) {
      try {
        const result = await supabaseDatabase.verifyRewardSession(sessionId, uniqueIdempKey);
        return {
          success: true,
          message: 'Demo reward verified and credited successfully!',
          pointsEarned: result.pointsEarned,
          newBalance: result.newBalance,
          transactionReference: result.transactionReference,
          sessionId,
          providerTransactionId: result.providerTransactionId || `DEMO-TX-${sessionId.slice(0, 8)}`,
        };
      } catch (err: any) {
        console.warn('Supabase verifyRewardSession failed, attempting API fallback:', err);
        // Fallback to Express backend API below
      }
    }

    // Fallback to Express Backend
    const res = await api.verifyAndClaimReward(sessionId, {
      idempotencyKey: uniqueIdempKey,
      elapsedSeconds: elapsedSeconds || 30,
    });

    return {
      success: res.success,
      message: res.message || 'Reward verified successfully',
      pointsEarned: res.pointsEarned,
      newBalance: res.newBalance,
      transactionReference: res.transactionReference,
      sessionId,
      providerTransactionId: res.providerTransactionId,
    };
  }

  /**
   * Retrieves the latest status of a reward session from the server.
   */
  async getRewardStatus(sessionId: string): Promise<RewardSessionStatus> {
    if (isSupabaseConfigured()) {
      const session = await supabaseDatabase.getRewardSessionById(sessionId);
      if (session) return session.status;
    }
    return 'started';
  }
}
