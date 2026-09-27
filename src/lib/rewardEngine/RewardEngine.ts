import {
  IRewardProvider,
  RewardOpportunityItem,
  RewardSessionItem,
  RewardClaimResult,
} from './RewardProvider';
import { DemoRewardProvider } from './DemoRewardProvider';

export class RewardEngineService {
  private providers: Map<string, IRewardProvider> = new Map();
  private defaultProvider: string = 'Demo';

  constructor() {
    // Register Demo provider by default
    this.registerProvider(new DemoRewardProvider());
  }

  /**
   * Registers a new provider (e.g. Demo, or future Real ad providers).
   */
  registerProvider(provider: IRewardProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  /**
   * Retrieves a provider by name, defaulting to Demo.
   */
  getProvider(providerName?: string): IRewardProvider {
    const key = (providerName || this.defaultProvider).toLowerCase();
    const provider = this.providers.get(key);
    if (provider) {
      return provider;
    }
    // Fallback to demo
    const demo = this.providers.get('demo');
    if (!demo) {
      const fallback = new DemoRewardProvider();
      this.registerProvider(fallback);
      return fallback;
    }
    return demo;
  }

  /**
   * Helper: Start a session with the appropriate provider
   */
  async startSession(opportunity: RewardOpportunityItem): Promise<RewardSessionItem> {
    const provider = this.getProvider(opportunity.provider);
    return provider.createSession(opportunity.id);
  }

  /**
   * Helper: Verify completion with the appropriate provider
   */
  async verifySession(
    providerName: string,
    sessionId: string,
    idempotencyKey?: string,
    elapsedSeconds?: number
  ): Promise<RewardClaimResult> {
    const provider = this.getProvider(providerName);
    return provider.verifyCompletion(sessionId, idempotencyKey, elapsedSeconds);
  }
}

export const RewardEngine = new RewardEngineService();
export * from './RewardProvider';
export * from './DemoRewardProvider';
