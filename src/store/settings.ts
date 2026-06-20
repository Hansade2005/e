import { create } from 'zustand';
import { storage } from '@/lib/storage';

export type Units = 'mi' | 'km';

const KEY = 'ez2go.settings';

type SettingsState = {
  units: Units;
  notifyRides: boolean;
  notifyPromos: boolean;
  quietByDefault: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setUnits: (u: Units) => Promise<void>;
  toggle: (k: 'notifyRides' | 'notifyPromos' | 'quietByDefault') => Promise<void>;
};

function snapshot(s: SettingsState) {
  return {
    units: s.units,
    notifyRides: s.notifyRides,
    notifyPromos: s.notifyPromos,
    quietByDefault: s.quietByDefault,
  };
}

export const useSettings = create<SettingsState>((set, get) => ({
  units: 'mi',
  notifyRides: true,
  notifyPromos: true,
  quietByDefault: false,
  loaded: false,

  async load() {
    if (get().loaded) return;
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({
          units: s.units ?? 'mi',
          notifyRides: s.notifyRides ?? true,
          notifyPromos: s.notifyPromos ?? true,
          quietByDefault: s.quietByDefault ?? false,
          loaded: true,
        });
        return;
      } catch {
        /* ignore */
      }
    }
    set({ loaded: true });
  },

  async setUnits(u) {
    set({ units: u });
    await storage.setItem(KEY, JSON.stringify(snapshot(get())));
  },

  async toggle(k) {
    set({ [k]: !get()[k] } as Partial<SettingsState>);
    await storage.setItem(KEY, JSON.stringify(snapshot(get())));
  },
}));
