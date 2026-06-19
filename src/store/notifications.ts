import { create } from 'zustand';
import { storage } from '@/lib/storage';
import type { Ionicons } from '@expo/vector-icons';

export type Notif = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'jade' | 'amber' | 'ink';
  title: string;
  body: string;
  at: number;
  read: boolean;
  kind?: 'ride' | 'promo' | 'scheduled' | 'system';
};

const KEY = 'ez2go.notifications';

type NotifState = {
  items: Notif[];
  loaded: boolean;
  load: () => Promise<void>;
  push: (n: Omit<Notif, 'id' | 'at' | 'read'>) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const SEED: Notif[] = [
  {
    id: 'n_welcome',
    icon: 'sparkles',
    tone: 'jade',
    title: 'Welcome to Ez2go',
    body: 'Drivers keep 100% of every fare. Tap “Where to?” to take your first ride.',
    at: Date.now() - 3600_000,
    read: false,
    kind: 'system',
  },
  {
    id: 'n_promo',
    icon: 'pricetag',
    tone: 'amber',
    title: 'Gift: try code EZ10',
    body: 'Add EZ10 in Payment to drop $10 into your Ez Wallet.',
    at: Date.now() - 7200_000,
    read: false,
    kind: 'promo',
  },
];

async function persist(items: Notif[]) {
  await storage.setItem(KEY, JSON.stringify(items));
}

export const useNotifications = create<NotifState>((set, get) => ({
  items: [],
  loaded: false,

  async load() {
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        set({ items: JSON.parse(raw) as Notif[], loaded: true });
        return;
      } catch {
        /* ignore */
      }
    }
    set({ items: SEED, loaded: true });
    await persist(SEED);
  },

  async push(n) {
    const item: Notif = {
      ...n,
      id: 'n_' + Math.random().toString(36).slice(2, 10),
      at: Date.now(),
      read: false,
    };
    const items = [item, ...get().items].slice(0, 60);
    set({ items });
    await persist(items);
  },

  async markAllRead() {
    const items = get().items.map((i) => ({ ...i, read: true }));
    set({ items });
    await persist(items);
  },
}));

export function unreadCount(items: Notif[]): number {
  return items.filter((i) => !i.read).length;
}
