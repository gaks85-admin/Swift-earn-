import {
  PaymentProvider,
  PaymentRequestParams,
  PaymentResponse,
  PaymentStatusResponse,
  PaymentVerificationResponse,
  PaymentCallbackResult,
} from './PaymentProvider';

/**
 * DemoPaymentProvider
 * 
 * Safely simulates the Nigerian instant payout lifecycle:
 * - Initiates demo transfer in 'processing' status
 * - Simulates instant bank/wallet verification
 * - Allows deterministic failure testing (e.g. invalid accounts or test triggers)
 * - Explicitly tags all references with DEMO-TEST prefixes
 * - NEVER touches real financial rails or secrets
 */
export class DemoPaymentProvider implements PaymentProvider {
  name = 'SwiftEarn Demo Settlement Gateway';
  isDemo = true;

  async createPayment(params: PaymentRequestParams): Promise<PaymentResponse> {
    // Generate a unique demo gateway reference
    const demoRef = `DEMO-TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Deterministic test failure condition: account ending with '0000' or '9999' or amount = 666
    const isSimulatedFailure =
      params.accountDetails.account_number?.endsWith('0000') ||
      params.accountDetails.account_number?.endsWith('9999') ||
      params.accountDetails.wallet_account_id?.endsWith('0000') ||
      params.amount === 666;

    if (isSimulatedFailure) {
      return {
        success: false,
        provider: this.name,
        isDemo: true,
        providerReference: demoRef,
        status: 'failed',
        message: '[DEMO TEST MODE] Simulated payout gateway failure (account validation error).',
      };
    }

    return {
      success: true,
      provider: this.name,
      isDemo: true,
      providerReference: demoRef,
      status: 'processing',
      message: '[DEMO TEST MODE] Payout request accepted by Demo Settlement Gateway.',
    };
  }

  async getPaymentStatus(reference: string, providerReference?: string): Promise<PaymentStatusResponse> {
    const isFailedRef = reference.includes('FAIL') || providerReference?.includes('FAIL');
    return {
      provider: this.name,
      isDemo: true,
      providerReference: providerReference || `DEMO-STATUS-${reference}`,
      status: isFailedRef ? 'failed' : 'completed',
      processedAt: new Date().toISOString(),
      failureReason: isFailedRef ? '[DEMO TEST] Account name mismatch at destination bank' : undefined,
      message: '[DEMO TEST MODE] Simulated transaction verification.',
    };
  }

  async verifyPayment(reference: string, providerReference?: string): Promise<PaymentVerificationResponse> {
    const isFailedRef = reference.includes('FAIL') || providerReference?.includes('FAIL');
    return {
      verified: true,
      status: isFailedRef ? 'failed' : 'completed',
      amount: 500,
      currency: 'NGN',
      providerReference: providerReference || `DEMO-VERIFY-${reference}`,
      message: '[DEMO TEST MODE] Payout verified in demo test sandbox.',
    };
  }

  async processCallback(payload: any): Promise<PaymentCallbackResult> {
    const ref = payload?.reference || payload?.data?.reference || 'UNKNOWN-REF';
    const providerRef = payload?.provider_reference || `DEMO-CB-${Date.now()}`;
    const status = payload?.status === 'failed' ? 'failed' : 'completed';

    return {
      handled: true,
      reference: ref,
      providerReference: providerRef,
      newStatus: status,
      failureReason: status === 'failed' ? payload?.reason || '[DEMO TEST] Simulated webhook failure' : undefined,
      rawEvent: payload,
    };
  }
}

export const demoPaymentProvider = new DemoPaymentProvider();
