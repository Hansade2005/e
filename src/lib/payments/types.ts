/**
 * Payment abstraction. The whole app talks to `PaymentProvider` only — never to
 * a concrete gateway. Swapping in Stripe later means writing a StripeProvider
 * that implements this interface and registering it in `payments/index.ts`;
 * no screen needs to change.
 */

export type PaymentMethod = {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'cash' | 'wallet';
  label: string; // e.g. "Visa •••• 4242"
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
};

export type ChargeRequest = {
  amount: number; // major units (USD)
  currency: string;
  methodId: string;
  description: string;
  rideId?: string;
};

export type ChargeResult = {
  id: string;
  status: 'succeeded' | 'failed' | 'requires_action';
  amount: number;
  currency: string;
  createdAt: string;
  receiptUrl?: string;
};

export interface PaymentProvider {
  readonly name: string;
  listMethods(): Promise<PaymentMethod[]>;
  addCard(input: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  }): Promise<PaymentMethod>;
  removeMethod(id: string): Promise<void>;
  setDefault(id: string): Promise<void>;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}
