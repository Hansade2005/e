import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { useWallet } from '@/store/wallet';
import { useNotifications } from '@/store/notifications';

export const INVITE_CREDIT = 10; // USD to each side

const KEY = 'ez2go.referral';

type ReferralState = {
  userId: string | null;
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

function currentUserId(): string {
  return useAuth.getState().user?.id ?? 'guest';
}

async function persist(
  userId: string,
  s: { code: string; appliedCode: string | null; earned: number; invited: number },
) {
  await storage.setItem(`${KEY}.${userId}`, JSON.stringify(s));
}

export const useReferral = create<ReferralState>((set, get) => ({
  userId: null,
  code: '',
  appliedCode: null,
  earned: 0,
  invited: 0,
  loaded: false,

  async load() {
    const userId = currentUserId();
    if (get().loaded && get().userId === userId) return;

    const raw = await storage.getItem(`${KEY}.${userId}`);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ userId, code: s.code, appliedCode: s.appliedCode ?? null, earned: s.earned ?? 0, invited: s.invited ?? 0, loaded: true });
        if (s.code) return;
      } catch {
        /* ignore */
      }
    }
    const code = deriveCode(useAuth.getState().user?.id ?? '');
    set({ userId, code, loaded: true });
    await persist(userId, { code, appliedCode: get().appliedCode, earned: get().earned, invited: get().invited });
  },

  async applyCode(input) {
    const code = input.trim().toUpperCase();
    if (!code) return { ok: false, message: 'Enter a code' };
    if (code === get().code) return { ok: false, message: "That's your own code" };
    if (get().appliedCode) return { ok: false, message: 'You already redeemed a code' };
    if (!/^EZ[A-Z0-9]{4,}$/.test(code)) return { ok: false, message: "That code isn't valid" };

    // The credit lands in the wallet; "earned" tracks referral payouts (when a
    // friend uses YOUR code), so we don't inflate it on redemption.
    await useWallet.getState().topUp(INVITE_CREDIT);
    const next = { code: get().code, appliedCode: code, earned: get().earned, invited: get().invited };
    set(next);
    await persist(currentUserId(), next);
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
