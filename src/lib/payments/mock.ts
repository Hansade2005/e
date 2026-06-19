import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentMethod,
  PaymentProvider,
} from './types';

const STORE_KEY = 'ez2go.payment.methods';

const SEED: PaymentMethod[] = [
  {
    id: 'pm_visa',
    brand: 'visa',
    label: 'Visa •••• 4242',
    last4: '4242',
    expMonth: 8,
    expYear: 2029,
    isDefault: true,
  },
  { id: 'pm_cash', brand: 'cash', label: 'Cash', isDefault: false },
];

// Cross-platform tiny KV: localStorage on web, AsyncStorage on native.
const kv = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  async set(key: string, val: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, val);
      } catch {
        /* ignore */
      }
      return;
    }
    await AsyncStorage.setItem(key, val);
  },
};

function brandFromNumber(num: string): PaymentMethod['brand'] {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (n.startsWith('34') || n.startsWith('37')) return 'amex';
  return 'mastercard';
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  private async read(): Promise<PaymentMethod[]> {
    const raw = await kv.get(STORE_KEY);
    if (!raw) {
      await kv.set(STORE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    try {
      return JSON.parse(raw) as PaymentMethod[];
    } catch {
      return SEED;
    }
  }

  private async write(methods: PaymentMethod[]): Promise<void> {
    await kv.set(STORE_KEY, JSON.stringify(methods));
  }

  async listMethods(): Promise<PaymentMethod[]> {
    return this.read();
  }

  async addCard(input: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  }): Promise<PaymentMethod> {
    const methods = await this.read();
    const last4 = input.number.replace(/\s/g, '').slice(-4);
    const brand = brandFromNumber(input.number);
    const method: PaymentMethod = {
      id: 'pm_' + Math.random().toString(36).slice(2, 10),
      brand,
      label: `${capitalize(brand)} •••• ${last4}`,
      last4,
      expMonth: input.expMonth,
      expYear: input.expYear,
      isDefault: methods.length === 0,
    };
    await this.write([...methods, method]);
    return method;
  }

  async removeMethod(id: string): Promise<void> {
    const methods = (await this.read()).filter((m) => m.id !== id);
    if (methods.length && !methods.some((m) => m.isDefault)) methods[0].isDefault = true;
    await this.write(methods);
  }

  async setDefault(id: string): Promise<void> {
    const methods = (await this.read()).map((m) => ({ ...m, isDefault: m.id === id }));
    await this.write(methods);
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    // Simulate network + processing latency.
    await new Promise((r) => setTimeout(r, 900));
    return {
      id: 'ch_' + Math.random().toString(36).slice(2, 12),
      status: 'succeeded',
      amount: req.amount,
      currency: req.currency,
      createdAt: new Date().toISOString(),
      receiptUrl: undefined,
    };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
