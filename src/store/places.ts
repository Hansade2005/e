import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import {
  deleteSavedPlaceRemote,
  fetchSavedPlacesRemote,
  upsertSavedPlaceRemote,
  type SavedPlace,
} from '@/lib/db';
import type { Place } from '@/lib/geo';

const PLACES_KEY = 'ez2go.places';

type PlacesState = {
  places: SavedPlace[];
  loaded: boolean;
  load: () => Promise<void>;
  byKind: (kind: SavedPlace['kind']) => SavedPlace | undefined;
  setPlace: (kind: 'home' | 'work', place: Place) => Promise<void>;
  addFavorite: (place: Place) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

async function persistLocal(places: SavedPlace[]) {
  await storage.setItem(PLACES_KEY, JSON.stringify(places));
}

export const usePlaces = create<PlacesState>((set, get) => ({
  places: [],
  loaded: false,

  async load() {
    const raw = await storage.getItem(PLACES_KEY);
    let local: SavedPlace[] = [];
    if (raw) {
      try {
        local = JSON.parse(raw) as SavedPlace[];
        set({ places: local, loaded: true });
      } catch {
        /* ignore */
      }
    }
    const userId = useAuth.getState().user?.id;
    if (userId) {
      const remote = await fetchSavedPlacesRemote(userId);
      if (remote.length) {
        set({ places: remote, loaded: true });
        await persistLocal(remote);
        return;
      }
    }
    set({ loaded: true });
  },

  byKind(kind) {
    return get().places.find((p) => p.kind === kind);
  },

  async setPlace(kind, place) {
    const userId = useAuth.getState().user?.id;
    const next: SavedPlace = {
      id: 'sp_' + Math.random().toString(36).slice(2, 10),
      kind,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    };
    // one Home / one Work
    const others = get().places.filter((p) => p.kind !== kind);
    const dbId = await upsertSavedPlaceRemote(userId ?? '', next);
    if (dbId) {
      next.dbId = dbId;
      next.id = dbId;
    }
    const places = [...others, next];
    set({ places });
    await persistLocal(places);
  },

  async addFavorite(place) {
    const userId = useAuth.getState().user?.id;
    const fav: SavedPlace = {
      id: 'sp_' + Math.random().toString(36).slice(2, 10),
      kind: 'favorite',
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    };
    const dbId = await upsertSavedPlaceRemote(userId ?? '', fav);
    if (dbId) {
      fav.dbId = dbId;
      fav.id = dbId;
    }
    const places = [...get().places, fav];
    set({ places });
    await persistLocal(places);
  },

  async remove(id) {
    const target = get().places.find((p) => p.id === id);
    if (target?.dbId) await deleteSavedPlaceRemote(target.dbId);
    const places = get().places.filter((p) => p.id !== id);
    set({ places });
    await persistLocal(places);
  },
}));
