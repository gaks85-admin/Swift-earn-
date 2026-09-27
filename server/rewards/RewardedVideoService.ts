import {
  RewardedVideoProvider,
  RewardedVideoSessionParams,
  RewardedVideoSessionResult,
  RewardedVideoStatusResult,
  RewardedVideoCompletionParams,
  RewardedVideoCallbackParams,
  RewardedVideoVerificationResult,
} from './RewardedVideoProvider.js';
import { DemoRewardedVideoProvider } from './providers/DemoRewardedVideoProvider.js';
import { AdcashRewardedVideoProvider } from './providers/AdcashRewardedVideoProvider.js';
import { MonetagRewardedVideoProvider } from './providers/MonetagRewardedVideoProvider.js';
import { dbManager } from '../db.js';

/**
 * RewardedVideoService
 *
 * Central coordinator for Rewarded Video providers in Swift Earn.
 * Handles provider resolution, environment security guards, session management,
 * and server-side verification.
 */
export class RewardedVideoService {
  private static instance: RewardedVideoService;
  private providers: Map<string, RewardedVideoProvider> = new Map();
  private defaultProviderName: string = process.env.REWARDED_VIDEO_PROVIDER || 'adcash';

  private constructor() {
    this.registerProvider(new AdcashRewardedVideoProvider());
    this.registerProvider(new MonetagRewardedVideoProvider());
  }

  public static getInstance(): RewardedVideoService {
    if (!RewardedVideoService.instance) {
      RewardedVideoService.instance = new RewardedVideoService();
    }
    return RewardedVideoService.instance;
  }

  public registerProvider(provider: RewardedVideoProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  /**
   * Resolves the configured provider based on the REWARDED_VIDEO_PROVIDER environment variable.
   * If in production and no certified provider is configured, safely returns null / throws.
   */
  public getProvider(providerName?: string): RewardedVideoProvider | null {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDemo = process.env.ALLOW_DEMO_REWARDS === 'true';

    // In production, require explicit provider configuration or allowDemo flag
    const configuredName =
      providerName ||
      process.env.REWARDED_VIDEO_PROVIDER ||
      (!isProduction || allowDemo ? this.defaultProviderName : '');

    if (!configuredName) {
      return null;
    }

    const provider = this.providers.get(configuredName);
    if (!provider) {
      return null;
    }

    // Production safety check: Do not allow Demo provider in production unless ALLOW_DEMO_REWARDS is true
    if (provider.isDemo && isProduction && !allowDemo) {
      return null;
    }

    return provider;
  }

  /**
   * Check if a live, active rewarded video provider is currently available to users.
   */
  public isAvailable(): boolean {
    const provider = this.getProvider();
    return provider !== null;
  }

  public async startSession(
    params: RewardedVideoSessionParams,
    providerName?: string
  ): Promise<RewardedVideoSessionResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(
        'Rewarded video service is currently unavailable. No verified provider is active.'
      );
    }
    return provider.createSession(params);
  }

  public async getStatus(
    sessionId: string,
    providerName?: string
  ): Promise<RewardedVideoStatusResult> {
    const session = dbManager.findRewardSession(sessionId);
    const resolvedName = providerName || session?.provider || session?.metadata?.providerName || 'demo_rewarded_video';
    const provider = this.getProvider(resolvedName);
    if (!provider) {
      throw new Error('Rewarded video service is currently unavailable.');
    }
    return provider.getStatus(sessionId);
  }

  public async verifyCompletion(
    params: RewardedVideoCompletionParams,
    providerName?: string
  ): Promise<RewardedVideoVerificationResult> {
    const session = dbManager.findRewardSession(params.sessionId);
    const resolvedName = providerName || session?.provider || session?.metadata?.providerName || 'demo_rewarded_video';
    const provider = this.getProvider(resolvedName);
    if (!provider) {
      throw new Error('Rewarded video service is currently unavailable.');
    }
    return provider.verifyCompletion(params);
  }

  public async processCallback(
    params: RewardedVideoCallbackParams
  ): Promise<RewardedVideoVerificationResult> {
    const provider = this.getProvider(params.providerName);
    if (!provider) {
      throw new Error(
        `Unable to process callback: Provider ${params.providerName} not found or inactive.`
      );
    }
    return provider.processCallback(params);
  }
}

export const rewardedVideoService = RewardedVideoService.getInstance();
