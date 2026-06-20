import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { useWallet } from '@/store/wallet';
import { useNotifications } from '@/store/notifications';

export const INVITE_CREDIT = 10; // USD to each side

const KEY = 'ez2go.referral';

type ReferralState = {
  code: string;
  appliedCode: string | null;
  earned: number;
  invited: number;
  loaded: boolean;
  load: () => Promise<void>;
  applyCode: (input: string) => Promise<{ ok: boolean; message: string }>;
};

function deriveCode(seed: string): string {
  const base = (seed || Math.random().toString(36)).replace(/[^a-z0-9]/gi, '').toUpperCase();
  return 'EZ' + (base.slice(0, 6) || 'RIDE01');
}

async function persist(s: { code: string; appliedCode: string | null; earned: number; invited: number }) {
  await storage.setItem(KEY, JSON.stringify(s));
}

export const useReferral = create<ReferralState>((set, get) => ({
  code: '',
  appliedCode: null,
  earned: 0,
  invited: 0,
  loaded: false,

  async load() {
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ code: s.code, appliedCode: s.appliedCode ?? null, earned: s.earned ?? 0, invited: s.invited ?? 0, loaded: true });
        if (s.code) return;
      } catch {
        /* ignore */
      }
    }
    const code = deriveCode(useAuth.getState().user?.id ?? '');
    set({ code, loaded: true });
    await persist({ code, appliedCode: get().appliedCode, earned: get().earned, invited: get().invited });
  },

  async applyCode(input) {
    const code = input.trim().toUpperCase();
    if (!code) return { ok: false, message: 'Enter a code' };
    if (code === get().code) return { ok: false, message: "That's your own code" };
    if (get().appliedCode) return { ok: false, message: 'You already redeemed a code' };
    if (!/^EZ[A-Z0-9]{4,}$/.test(code)) return { ok: false, message: "That code isn't valid" };

    await useWallet.getState().topUp(INVITE_CREDIT);
    const next = { code: get().code, appliedCode: code, earned: get().earned + INVITE_CREDIT, invited: get().invited };
    set(next);
    await persist(next);
    void useNotifications.getState().push({
      icon: 'gift',
      tone: 'amber',
      kind: 'promo',
      title: 'Referral applied',
      body: `$${INVITE_CREDIT.toFixed(2)} added to your Ez Wallet — welcome to Ez2go!`,
    });
    return { ok: true, message: `$${INVITE_CREDIT.toFixed(2)} added to your wallet` };
  },
}));
