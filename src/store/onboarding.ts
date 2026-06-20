import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { upsertDriverProfileRemote } from '@/lib/db';

export type DriverSetup = {
  make: string;
  model: string;
  year: string;
  color: string;
  plate: string;
  license: string;
  insurance: string;
  payout: string;
  gender: string; // 'female' | 'male' | 'other'
};

const KEY = 'ez2go.onboarding';

type OnboardingState = {
  riderDone: boolean;
  driverDone: boolean;
  driver: DriverSetup | null;
  loaded: boolean;
  load: () => Promise<void>;
  completeRider: () => Promise<void>;
  saveDriver: (setup: DriverSetup) => Promise<void>;
};

async function persist(s: { riderDone: boolean; driverDone: boolean; driver: DriverSetup | null }) {
  await storage.setItem(KEY, JSON.stringify(s));
}

export const useOnboarding = create<OnboardingState>((set, get) => ({
  riderDone: false,
  driverDone: false,
  driver: null,
  loaded: false,

  async load() {
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ riderDone: !!s.riderDone, driverDone: !!s.driverDone, driver: s.driver ?? null, loaded: true });
        return;
      } catch {
        /* ignore */
      }
    }
    set({ loaded: true });
  },

  async completeRider() {
    set({ riderDone: true });
    await persist({ riderDone: true, driverDone: get().driverDone, driver: get().driver });
  },

  async saveDriver(setup) {
    set({ driverDone: true, driver: setup });
    await persist({ riderDone: get().riderDone, driverDone: true, driver: setup });
    const userId = useAuth.getState().user?.id;
    if (userId) void upsertDriverProfileRemote(userId, setup);
  },
}));
