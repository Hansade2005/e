import { create } from 'zustand';
import { DEFAULT_CENTER, getRoute, localPlaces, type LatLng, type Place } from '@/lib/geo';
import { storage } from '@/lib/storage';

export type RideRequest = {
  id: string;
  rider: string;
  riderRating: number;
  pickup: Place;
  destination: Place;
  fare: number;
  distanceMi: number;
  etaMin: number;
  pickupRoute: LatLng[];
  tripRoute: LatLng[];
};

export type DriverPhase =
  | 'offline'
  | 'online' // waiting for requests
  | 'offered' // a request is on screen
  | 'to_pickup'
  | 'arrived'
  | 'in_progress'
  | 'completed';

type DriverState = {
  phase: DriverPhase;
  online: boolean;
  request: RideRequest | null;
  earningsToday: number;
  tripsToday: number;
  onlineMinutes: number;
  lastFare: number;
  history: number[];
  goOnline: () => void;
  goOffline: () => void;
  receiveOffer: () => Promise<void>;
  accept: () => void;
  decline: () => void;
  advance: () => void;
  finish: () => Promise<void>;
  load: () => Promise<void>;
};

const KEY = 'ez2go.driver.stats';
let offerTimer: ReturnType<typeof setTimeout> | null = null;

const RIDERS = [
  { name: 'Jordan P.', rating: 4.9 },
  { name: 'Sam K.', rating: 4.8 },
  { name: 'Priya N.', rating: 5.0 },
  { name: 'Leo M.', rating: 4.7 },
];

async function buildRequest(): Promise<RideRequest> {
  const rider = RIDERS[Math.floor(Math.random() * RIDERS.length)];
  const pickup = localPlaces[Math.floor(Math.random() * localPlaces.length)];
  let destination = localPlaces[Math.floor(Math.random() * localPlaces.length)];
  if (destination.id === pickup.id) destination = localPlaces[(localPlaces.indexOf(pickup) + 2) % localPlaces.length];

  const driverStart: LatLng = { lat: pickup.lat + 0.01, lng: pickup.lng - 0.012 };
  const [toPickup, trip] = await Promise.all([
    getRoute(driverStart, pickup),
    getRoute(pickup, destination),
  ]);
  const fare = Math.max(6, 2.5 + trip.distanceKm * 1.05 + trip.durationMin * 0.25);
  return {
    id: 'req_' + Math.random().toString(36).slice(2, 8),
    rider: rider.name,
    riderRating: rider.rating,
    pickup,
    destination,
    fare: Math.round(fare * 100) / 100,
    distanceMi: Math.round(trip.distanceKm * 0.621371 * 10) / 10,
    etaMin: Math.max(1, Math.round(toPickup.durationMin)),
    pickupRoute: toPickup.coords,
    tripRoute: trip.coords,
  };
}

export const useDriver = create<DriverState>((set, get) => ({
  phase: 'offline',
  online: false,
  request: null,
  earningsToday: 0,
  tripsToday: 0,
  onlineMinutes: 0,
  lastFare: 0,
  history: [],

  goOnline() {
    set({ online: true, phase: 'online' });
    get().receiveOffer();
  },

  goOffline() {
    if (offerTimer) clearTimeout(offerTimer);
    set({ online: false, phase: 'offline', request: null });
  },

  async receiveOffer() {
    if (offerTimer) clearTimeout(offerTimer);
    offerTimer = setTimeout(async () => {
      if (!get().online || get().phase !== 'online') return;
      const req = await buildRequest();
      if (get().online && get().phase === 'online') {
        set({ request: req, phase: 'offered' });
      }
    }, 2600);
  },

  accept() {
    if (get().request) set({ phase: 'to_pickup' });
  },

  decline() {
    set({ request: null, phase: 'online' });
    get().receiveOffer();
  },

  advance() {
    const phase = get().phase;
    if (phase === 'to_pickup') set({ phase: 'arrived' });
    else if (phase === 'arrived') set({ phase: 'in_progress' });
    else if (phase === 'in_progress') set({ phase: 'completed' });
  },

  async finish() {
    const req = get().request;
    const fare = req?.fare ?? 0;
    const earningsToday = get().earningsToday + fare;
    const tripsToday = get().tripsToday + 1;
    const history = [fare, ...get().history].slice(0, 30);
    set({
      earningsToday,
      tripsToday,
      lastFare: fare,
      history,
      request: null,
      phase: get().online ? 'online' : 'offline',
    });
    await storage.setItem(KEY, JSON.stringify({ earningsToday, tripsToday, history }));
    if (get().online) get().receiveOffer();
  },

  async load() {
    const raw = await storage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ earningsToday: s.earningsToday ?? 0, tripsToday: s.tripsToday ?? 0, history: s.history ?? [] });
      } catch {
        /* ignore */
      }
    }
  },
}));

export const DRIVER_HOME: LatLng = DEFAULT_CENTER;
