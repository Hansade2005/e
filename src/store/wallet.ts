import { create } from 'zustand';
import { storage } from '@/lib/storage';

export type WalletTxn = {
  id: string;
  type: 'promo' | 'spend' | 'topup';
  amount: number; // positive = credit added, negative = spent
  label: string;
  at: number;
};

// Demo promo codes. In production these would be validated server-side.
const PROMOS: Record<string, { amount: number; label: string }> = {
  EZ10: { amount: 10, label: 'EZ10 welcome credit' },
  WELCOME5: { amount: 5, label: 'Welcome bonus' },
  RIDE2GO: { amount: 7, label: 'Ride2Go promo' },
};

const KEY = 'ez2go.wallet';

type WalletState = {
  balance: number;
  txns: WalletTxn[];
  applied: string[];
  loaded: boolean;
  load: () => Promise<void>;
  applyPromo: (code: string) => Promise<{ ok: boolean; message: string; amount?: number }>;
  topUp: (amount: number) => Promise<void>;
  /** Spend up to `amount` of wallet credit; returns the amount actually applied. */
  spend: (amount: number, label: string) => Promise<number>;
};

async function persist(s: { balance: number; txns: WalletTxn[]; applied: string[] }) {
  await storage.setItem(KEY, JSON.stringify(s));
}

export const useWallet = create<WalletState>((set, get) => ({
  balance: 0,
  txns: [],
  applied: [],
  loaded: false,

  async load() {
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ balance: s.balance ?? 0, txns: s.txns ?? [], applied: s.applied ?? [], loaded: true });
        return;
      } catch {
        /* ignore */
      }
    }
    set({ loaded: true });
  },

  async applyPromo(code) {
    const key = code.trim().toUpperCase();
    if (!key) return { ok: false, message: 'Enter a code' };
    if (get().applied.includes(key)) return { ok: false, message: 'Code already used' };
    const promo = PROMOS[key];
    if (!promo) return { ok: false, message: "That code isn't valid" };
    const txn: WalletTxn = {
      id: 'tx_' + Math.random().toString(36).slice(2, 9),
      type: 'promo',
      amount: promo.amount,
      label: promo.label,
      at: Date.now(),
    };
    const next = {
      balance: get().balance + promo.amount,
      txns: [txn, ...get().txns].slice(0, 50),
      applied: [...get().applied, key],
    };
    set(next);
    await persist(next);
    return { ok: true, message: `$${promo.amount.toFixed(2)} added to your wallet`, amount: promo.amount };
  },

  async topUp(amount) {
    const txn: WalletTxn = {
      id: 'tx_' + Math.random().toString(36).slice(2, 9),
      type: 'topup',
      amount,
      label: 'Wallet top-up',
      at: Date.now(),
    };
    const next = { balance: get().balance + amount, txns: [txn, ...get().txns].slice(0, 50), applied: get().applied };
    set(next);
    await persist(next);
  },

  async spend(amount, label) {
    const credit = Math.min(get().balance, Math.max(0, amount));
    if (credit <= 0) return 0;
    const txn: WalletTxn = {
      id: 'tx_' + Math.random().toString(36).slice(2, 9),
      type: 'spend',
      amount: -credit,
      label,
      at: Date.now(),
    };
    const next = { balance: get().balance - credit, txns: [txn, ...get().txns].slice(0, 50), applied: get().applied };
    set(next);
    await persist(next);
    return credit;
  },
}));
