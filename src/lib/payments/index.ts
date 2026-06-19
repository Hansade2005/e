import { MockPaymentProvider } from './mock';
import type { PaymentProvider } from './types';

// Single switch-point for the whole app's payment gateway.
//
// To go live with Stripe:
//   1. Create `payments/stripe.ts` implementing `PaymentProvider` (use
//      @stripe/stripe-react-native + a thin server endpoint for PaymentIntents).
//   2. Replace the line below with `new StripeProvider()`.
// Nothing else in the app changes.
export const payments: PaymentProvider = new MockPaymentProvider();

export * from './types';
