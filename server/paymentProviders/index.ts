import { PaymentProvider } from './PaymentProvider';
import { demoPaymentProvider } from './DemoPaymentProvider';
import { realPaymentProvider } from './RealPaymentProvider';

export * from './PaymentProvider';
export * from './DemoPaymentProvider';
export * from './RealPaymentProvider';

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function getPaymentProvider(providerName?: string): PaymentProvider {
  const isKeyConfigured = isPaystackConfigured();

  if (providerName?.toLowerCase().includes('demo')) {
    return demoPaymentProvider;
  }

  if (providerName?.toLowerCase().includes('real') || providerName?.toLowerCase().includes('paystack')) {
    return realPaymentProvider;
  }

  if (isKeyConfigured) {
    return realPaymentProvider;
  }

  return demoPaymentProvider;
}
