/**
 * RewardedVideoProvider.ts
 *
 * Core TypeScript interface and types for Swift Earn's Rewarded Video Provider Architecture.
 *
 * SPECIFICATION CONSTRAINTS:
 * 1. Clean provider abstraction supporting pluggable rewarded-video advertising networks.
 * 2. Strong typing for sessions, callbacks, verifications, status, and metadata.
 * 3. Never allows direct client-side crediting; all verification and ledger crediting
 *    must be performed server-side with strict idempotency and audit trails.
 * 4. Separate from publisher monetization (Adcash Autotag remains separate).
 */

export type RewardedVideoSessionStatus =
  | 'initiated'
  | 'started'
  | 'completed'
  | 'verified'
  | 'claimed'
  | 'failed'
  | 'expired';

export interface RewardedVideoSessionParams {
  userId: string;
  opportunityId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface RewardedVideoSessionResult {
  sessionId: string;
  providerSessionId: string;
  providerName: string;
  userId: string;
  opportunityId: string;
  rewardAmount: number;
  currency: string;
  status: RewardedVideoSessionStatus;
  startedAt: string;
  expiresAt: string;
  token: string;
  metadata?: Record<string, any>;
}

export interface RewardedVideoStatusResult {
  sessionId: string;
  providerSessionId: string;
  providerName: string;
  userId: string;
  status: RewardedVideoSessionStatus;
  rewardAmount: number;
  currency: string;
  completedAt?: string;
  verifiedAt?: string;
  claimedAt?: string;
  providerTransactionId?: string;
  metadata?: Record<string, any>;
}

export interface RewardedVideoCompletionParams {
  sessionId: string;
  userId: string;
  providerTransactionId?: string;
  idempotencyKey?: string;
  elapsedSeconds?: number;
  rawPayload?: Record<string, any>;
}

export interface RewardedVideoCallbackParams {
  providerName: string;
  providerTransactionId: string;
  sessionId: string;
  userId: string;
  rewardAmount?: number;
  currency?: string;
  signature?: string;
  timestamp?: number | string;
  rawPayload: Record<string, any>;
  ipAddress?: string;
}

export interface RewardedVideoVerificationResult {
  success: boolean;
  sessionId: string;
  providerTransactionId: string;
  providerName: string;
  userId: string;
  rewardAmount: number;
  currency: string;
  status: RewardedVideoSessionStatus;
  newBalance?: number;
  transactionReference?: string;
  alreadyProcessed?: boolean;
  message?: string;
  error?: string;
}

export interface RewardedVideoProvider {
  /** The unique identifier name of the provider (e.g. 'demo', 'unity', 'applovin', etc.) */
  readonly providerName: string;

  /** True if this is a development-only mock/simulation provider */
  readonly isDemo: boolean;

  /**
   * Initializes a new rewarded video session on the server.
   * Generates cryptographic token and bounds session to authoritative limits.
   */
  createSession(params: RewardedVideoSessionParams): Promise<RewardedVideoSessionResult>;

  /**
   * Retrieves current session lifecycle and verification status.
   */
  getStatus(sessionId: string): Promise<RewardedVideoStatusResult>;

  /**
   * Verifies completion from user or client interaction.
   * Note: Does NOT credit directly if provider requires server-to-server callback.
   */
  verifyCompletion(params: RewardedVideoCompletionParams): Promise<RewardedVideoVerificationResult>;

  /**
   * Handles incoming server-to-server webhook/callback from the advertising network.
   * Validates signatures, replay timestamps, idempotency, and executes authoritative ledger credit.
   */
  processCallback(params: RewardedVideoCallbackParams): Promise<RewardedVideoVerificationResult>;
}
