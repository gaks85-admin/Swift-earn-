export interface RewardOpportunityItem {
  id: string;
  name: string;
  description: string;
  reward_amount: number;
  estimated_duration: number; // in seconds
  daily_limit: number;
  status: 'active' | 'inactive' | 'archived';
  provider: string;
  category?: 'video' | 'survey' | 'app_trial' | 'sponsored_task';
  created_at: string;
  updated_at: string;
}

export type RewardSessionStatus = 'started' | 'pending' | 'completed' | 'expired' | 'failed' | 'rejected';

export interface RewardSessionItem {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: RewardSessionStatus;
  started_at: string;
  completed_at?: string;
  expires_at: string;
  provider: string;
  provider_session_id?: string;
  reward_amount: number;
  idempotency_key?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface RewardClaimResult {
  success: boolean;
  message: string;
  pointsEarned: number;
  newBalance: number;
  transactionReference: string;
  sessionId: string;
  providerTransactionId?: string;
}

export interface IRewardProvider {
  readonly name: string;
  readonly isDemo: boolean;
  
  /**
   * Initializes a verified reward session on the server.
   * The server assigns session ID, expiration, and trusted reward amount.
   */
  createSession(opportunityId: string): Promise<RewardSessionItem>;

  /**
   * Requests server-side verification and atomic ledger crediting.
   * Server validates authenticity, ownership, expiration, idempotency, and limits.
   */
  verifyCompletion(
    sessionId: string,
    idempotencyKey?: string,
    elapsedSeconds?: number
  ): Promise<RewardClaimResult>;

  /**
   * Queries the current status of a reward session.
   */
  getRewardStatus(sessionId: string): Promise<RewardSessionStatus>;
}
