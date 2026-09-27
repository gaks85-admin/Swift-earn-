export interface PaymentAccountDetails {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  wallet_provider?: string;
  wallet_account_id?: string;
  [key: string]: any;
}

export interface PaymentRequestParams {
  withdrawalId: string;
  amount: number;
  currency: string;
  reference: string;
  paymentMethod: string;
  accountDetails: PaymentAccountDetails;
  userEmail?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  provider: string;
  isDemo: boolean;
  providerReference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  rawResponse?: any;
}

export interface PaymentStatusResponse {
  provider: string;
  isDemo: boolean;
  providerReference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: string;
  failureReason?: string;
  message?: string;
  rawResponse?: any;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  providerReference: string;
  message?: string;
}

export interface PaymentCallbackResult {
  handled: boolean;
  reference: string;
  providerReference: string;
  newStatus: 'processing' | 'completed' | 'failed';
  failureReason?: string;
  rawEvent?: any;
}

export interface PaymentProvider {
  name: string;
  isDemo: boolean;
  createPayment(params: PaymentRequestParams): Promise<PaymentResponse>;
  getPaymentStatus(reference: string, providerReference?: string): Promise<PaymentStatusResponse>;
  verifyPayment(reference: string, providerReference?: string): Promise<PaymentVerificationResponse>;
  processCallback(payload: any): Promise<PaymentCallbackResult>;
}
