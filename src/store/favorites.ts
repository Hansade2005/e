import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import {
  addFavoriteRemote,
  fetchFavoritesRemote,
  removeFavoriteRemote,
  type FavoriteDriver,
} from '@/lib/db';

const KEY = 'ez2go.favorites';

type FavState = {
  favorites: FavoriteDriver[];
  loaded: boolean;
  load: () => Promise<void>;
  has: (ref: string) => boolean;
  toggle: (fav: FavoriteDriver) => Promise<void>;
  remove: (ref: string) => Promise<void>;
};

async function persist(favs: FavoriteDriver[]) {
  await storage.setItem(KEY, JSON.stringify(favs));
}

export const useFavorites = create<FavState>((set, get) => ({
  favorites: [],
  loaded: false,

  async load() {
    const raw = await storage.getItem(KEY);
    let local: FavoriteDriver[] = [];
    if (raw) {
      try {
        local = JSON.parse(raw) as FavoriteDriver[];
        set({ favorites: local, loaded: true });
      } catch {
        /* ignore */
      }
    }
    const userId = useAuth.getState().user?.id;
    if (userId) {
      const remote = await fetchFavoritesRemote(userId);
      // null = backend unreachable (keep local); otherwise remote is
      // authoritative, even when empty (favorites removed on another device).
      if (remote !== null) {
        set({ favorites: remote, loaded: true });
        await persist(remote);
        return;
      }
    }
    set({ loaded: true });
  },

  has(ref) {
    return get().favorites.some((f) => f.ref === ref);
  },

  async toggle(fav) {
    const userId = useAuth.getState().user?.id;
    if (get().has(fav.ref)) {
      const favorites = get().favorites.filter((f) => f.ref !== fav.ref);
      set({ favorites });
      await persist(favorites);
      if (userId) void removeFavoriteRemote(userId, fav.ref);
    } else {
      const favorites = [fav, ...get().favorites];
      set({ favorites });
      await persist(favorites);
      if (userId) void addFavoriteRemote(userId, fav);
    }
  },

  async remove(ref) {
    const userId = useAuth.getState().user?.id;
    const favorites = get().favorites.filter((f) => f.ref !== ref);
    set({ favorites });
    await persist(favorites);
    if (userId) void removeFavoriteRemote(userId, ref);
  },
}));
