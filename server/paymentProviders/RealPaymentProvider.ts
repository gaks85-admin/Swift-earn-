import crypto from 'crypto';
import {
  PaymentProvider,
  PaymentRequestParams,
  PaymentResponse,
  PaymentStatusResponse,
  PaymentVerificationResponse,
  PaymentCallbackResult,
} from './PaymentProvider';

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
}

export interface PaystackRecipientResponse {
  success: boolean;
  recipientCode?: string;
  name?: string;
  accountNumber?: string;
  bankCode?: string;
  message?: string;
  rawResponse?: any;
}

/**
 * Normalizes Swift Earn withdrawal reference into Paystack-compliant reference format.
 * Paystack requirements: lowercase, numbers, hyphens, underscores, 16–50 chars.
 * Example: 'SE-WTH-ABC1234567' -> 'se-wth-abc1234567'
 */
export function toPaystackReference(ref: string): string {
  if (!ref) {
    ref = `se-wth-${Date.now()}`;
  }
  const normalized = ref.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (normalized.length < 16) {
    return (normalized + '-0000000000000000').slice(0, 16);
  }
  if (normalized.length > 50) {
    return normalized.slice(0, 50);
  }
  return normalized;
}

/**
 * Production Paystack Payment Provider for NGN Bank Transfers.
 * Securely communicates with Paystack API exclusively server-side.
 */
export class RealPaymentProvider implements PaymentProvider {
  name = 'Paystack Nigerian NGN Bank Transfer';
  isDemo = false;

  private getSecretKey(): string | null {
    return process.env.PAYSTACK_SECRET_KEY || null;
  }

  /**
   * Verifies Paystack HMAC SHA512 signature against raw request body.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey || !signatureHeader) return false;

    try {
      const hash = crypto
        .createHmac('sha512', secretKey)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(hash, 'utf-8'),
        Buffer.from(signatureHeader, 'utf-8')
      );
    } catch (err) {
      console.error('Error verifying Paystack webhook signature:', err);
      return false;
    }
  }

  /**
   * Fetches supported Nigerian banks directly from Paystack.
   */
  async getBanks(): Promise<PaystackBank[]> {
    const apiKey = this.getSecretKey();
    if (!apiKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured on the server.');
    }

    const response = await fetch('https://api.paystack.co/bank?country=nigeria&currency=NGN', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data?.message || 'Failed to fetch Nigerian banks from Paystack.');
    }

    return (data.data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      code: b.code,
      longcode: b.longcode,
      gateway: b.gateway,
      pay_with_bank: b.pay_with_bank,
      active: b.active,
      country: b.country,
      currency: b.currency,
      type: b.type,
    }));
  }

  /**
   * Resolves a NUBAN account number against a Nigerian bank code via Paystack.
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<{ success: boolean; accountName?: string; accountNumber?: string; bankCode?: string; message?: string }> {
    const apiKey = this.getSecretKey();
    if (!apiKey) {
      return { success: false, message: 'PAYSTACK_SECRET_KEY is not configured on the server.' };
    }

    try {
      const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        return {
          success: false,
          message: data?.message || 'Could not resolve account details with Paystack clearing house.',
        };
      }

      return {
        success: true,
        accountName: data.data.account_name,
        accountNumber: data.data.account_number,
        bankCode: bankCode,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error connecting to Paystack account resolution service.',
      };
    }
  }

  /**
   * Creates or reuses a Paystack Transfer Recipient for NUBAN transfers.
   */
  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<PaystackRecipientResponse> {
    const apiKey = this.getSecretKey();
    if (!apiKey) {
      return { success: false, message: 'PAYSTACK_SECRET_KEY is not configured on the server.' };
    }

    try {
      const response = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: params.name,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: 'NGN',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        return {
          success: false,
          message: data?.message || 'Failed to create Paystack transfer recipient.',
          rawResponse: data,
        };
      }

      return {
        success: true,
        recipientCode: data.data.recipient_code,
        name: data.data.details?.account_name || params.name,
        accountNumber: data.data.details?.account_number || params.accountNumber,
        bankCode: data.data.details?.bank_code || params.bankCode,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error creating Paystack transfer recipient.',
      };
    }
  }

  /**
   * Initiates a Paystack NGN transfer to a recipient.
   */
  async createPayment(params: PaymentRequestParams): Promise<PaymentResponse> {
    const apiKey = this.getSecretKey();

    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        isDemo: false,
        providerReference: `UNCONFIGURED-${params.reference}`,
        status: 'failed',
        message:
          'Real payment gateway is disabled because PAYSTACK_SECRET_KEY is not configured in environment settings.',
      };
    }

    try {
      // 1. Ensure Paystack recipient code exists
      let recipientCode = params.accountDetails.paystack_recipient_code || params.accountDetails.recipient_code;

      if (!recipientCode) {
        const accNum = params.accountDetails.account_number || params.accountDetails.accountNumber;
        const bankCode = params.accountDetails.bank_code || params.accountDetails.bankCode;
        const accName = params.accountDetails.account_name || params.accountDetails.accountName || 'Swift Earn User';

        if (!accNum || !bankCode) {
          return {
            success: false,
            provider: this.name,
            isDemo: false,
            providerReference: `ERR-${params.reference}`,
            status: 'failed',
            message: 'Missing required bank account number or bank code for Paystack payout.',
          };
        }

        const recipientRes = await this.createTransferRecipient({
          name: accName,
          accountNumber: accNum,
          bankCode: bankCode,
        });

        if (!recipientRes.success || !recipientRes.recipientCode) {
          return {
            success: false,
            provider: this.name,
            isDemo: false,
            providerReference: `ERR-${params.reference}`,
            status: 'failed',
            message: recipientRes.message || 'Could not generate Paystack payout recipient.',
            rawResponse: recipientRes.rawResponse,
          };
        }

        recipientCode = recipientRes.recipientCode;
      }

      // 2. Format deterministic Paystack reference (lowercase, alphanumeric, min 16 chars)
      const paystackRef = toPaystackReference(params.reference);

      // 3. Amount in Kobo (1 NGN = 100 kobo)
      const amountInKobo = Math.round(params.amount * 100);

      // 4. Call Paystack Transfer API
      const response = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amountInKobo,
          recipient: recipientCode,
          reason: `Swift Earn Withdrawal Payout (${paystackRef})`,
          reference: paystackRef,
          currency: 'NGN',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return {
          success: false,
          provider: this.name,
          isDemo: false,
          providerReference: data?.data?.transfer_code || `ERR-${paystackRef}`,
          status: 'failed',
          message: data?.message || 'Payout transfer request was rejected by Paystack.',
          rawResponse: data,
        };
      }

      return {
        success: true,
        provider: this.name,
        isDemo: false,
        providerReference: data.data.transfer_code || data.data.reference || paystackRef,
        status: 'processing',
        message: 'Payout transfer initiated with Paystack. Pending settlement webhook confirmation.',
        rawResponse: { ...data, paystack_recipient_code: recipientCode, paystack_reference: paystackRef },
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        isDemo: false,
        providerReference: `ERR-${params.reference}`,
        status: 'failed',
        message: err.message || 'Network error connecting to Paystack transfer gateway.',
      };
    }
  }

  async getPaymentStatus(reference: string, providerReference?: string): Promise<PaymentStatusResponse> {
    const apiKey = this.getSecretKey();
    if (!apiKey) {
      return {
        provider: this.name,
        isDemo: false,
        providerReference: providerReference || reference,
        status: 'failed',
        message: 'Paystack Gateway unconfigured.',
      };
    }

    try {
      const paystackRef = toPaystackReference(reference);
      const targetRef = providerReference || paystackRef;
      const response = await fetch(`https://api.paystack.co/transfer/verify/${encodeURIComponent(targetRef)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
        success: 'completed',
        failed: 'failed',
        reversed: 'failed',
        pending: 'processing',
        processing: 'processing',
      };

      const mappedStatus = statusMap[data?.data?.status] || 'processing';

      return {
        provider: this.name,
        isDemo: false,
        providerReference: data?.data?.transfer_code || targetRef,
        status: mappedStatus,
        processedAt: data?.data?.transferred_at || new Date().toISOString(),
        failureReason: mappedStatus === 'failed' ? data?.data?.reason || data?.data?.gateway_response || 'Paystack transfer failed' : undefined,
        message: data?.message,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        provider: this.name,
        isDemo: false,
        providerReference: providerReference || reference,
        status: 'processing',
        message: err.message || 'Status query error',
      };
    }
  }

  async verifyPayment(reference: string, providerReference?: string): Promise<PaymentVerificationResponse> {
    const statusRes = await this.getPaymentStatus(reference, providerReference);
    return {
      verified: statusRes.status === 'completed',
      status: statusRes.status,
      amount: 0,
      currency: 'NGN',
      providerReference: statusRes.providerReference,
      message: statusRes.message,
    };
  }

  async processCallback(payload: any): Promise<PaymentCallbackResult> {
    const event = payload?.event;
    const data = payload?.data || payload;

    const reference = data?.reference || data?.tx_ref || 'UNKNOWN';
    const providerReference = data?.transfer_code || data?.id?.toString() || reference;

    let newStatus: 'processing' | 'completed' | 'failed' = 'processing';
    if (event === 'transfer.success' || data?.status === 'success') {
      newStatus = 'completed';
    } else if (
      event === 'transfer.failed' ||
      event === 'transfer.reversed' ||
      data?.status === 'failed' ||
      data?.status === 'reversed'
    ) {
      newStatus = 'failed';
    }

    return {
      handled: true,
      reference,
      providerReference,
      newStatus,
      failureReason: newStatus === 'failed' ? data?.reason || data?.gateway_response || 'Payout failed at bank' : undefined,
      rawEvent: payload,
    };
  }
}

export const realPaymentProvider = new RealPaymentProvider();
