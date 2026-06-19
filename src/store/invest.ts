import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { fetchInvestmentRemote, upsertInvestmentRemote } from '@/lib/db';

/** Demo equity model. Drivers buy Ez2go shares at a fixed price. */
export const SHARE_PRICE = 5; // USD per share
export const TOTAL_SHARES = 10_000_000; // notional cap table for ownership %

const KEY = 'ez2go.invest';

type InvestState = {
  invested: number; // total USD invested
  shares: number;
  loaded: boolean;
  load: () => Promise<void>;
  /** Buy `amount` USD of shares. Returns the shares added. */
  invest: (amount: number) => Promise<number>;
};

async function persist(s: { invested: number; shares: number }) {
  await storage.setItem(KEY, JSON.stringify(s));
}

export const useInvest = create<InvestState>((set, get) => ({
  invested: 0,
  shares: 0,
  loaded: false,

  async load() {
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ invested: s.invested ?? 0, shares: s.shares ?? 0, loaded: true });
      } catch {
        set({ loaded: true });
      }
    } else {
      set({ loaded: true });
    }
    const userId = useAuth.getState().user?.id;
    if (userId) {
      const remote = await fetchInvestmentRemote(userId);
      if (remote) {
        set({ invested: remote.totalInvested, shares: remote.shares });
        await persist({ invested: remote.totalInvested, shares: remote.shares });
      }
    }
  },

  async invest(amount) {
    if (amount <= 0) return 0;
    const addedShares = amount / SHARE_PRICE;
    const invested = Math.round((get().invested + amount) * 100) / 100;
    const shares = Math.round((get().shares + addedShares) * 10000) / 10000;
    set({ invested, shares });
    await persist({ invested, shares });
    const userId = useAuth.getState().user?.id;
    if (userId) void upsertInvestmentRemote(userId, { totalInvested: invested, shares });
    return addedShares;
  },
}));

export function ownershipPct(shares: number): number {
  return (shares / TOTAL_SHARES) * 100;
}
