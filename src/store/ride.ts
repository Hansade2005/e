import { create } from 'zustand';
import {
  DEFAULT_CENTER,
  getRoute,
  pointAlong,
  type LatLng,
  type Place,
} from '@/lib/geo';
import { estimateFare, VEHICLE_CLASSES, type Fare, type VehicleClass } from '@/constants/vehicles';
import { pickDriver, type DriverProfile } from '@/constants/drivers';
import { payments } from '@/lib/payments';
import { storage } from '@/lib/storage';

export type RideStatus =
  | 'idle' // nothing selected
  | 'planning' // pickup + destination chosen, picking vehicle
  | 'searching' // looking for a driver
  | 'arriving' // driver en route to pickup
  | 'arrived' // driver at pickup
  | 'in_progress' // trip underway
  | 'completed'; // dropped off

export type RideRecord = {
  id: string;
  createdAt: string;
  pickup: Place;
  destination: Place;
  vehicle: VehicleClass['id'];
  vehicleName: string;
  fare: number;
  distanceKm: number;
  durationMin: number;
  driverName: string;
  rating?: number;
  status: 'completed' | 'cancelled';
};

type Quote = { vehicle: VehicleClass; fare: Fare };

type RideState = {
  status: RideStatus;
  pickup: Place | null;
  destination: Place | null;
  route: LatLng[];
  distanceKm: number;
  durationMin: number;
  quotes: Quote[];
  selectedVehicleId: VehicleClass['id'];
  methodId: string;
  driver: DriverProfile | null;
  driverPos: LatLng | null;
  pickupRoute: LatLng[];
  etaMin: number;
  progress: number; // 0..1 along the active leg
  lastReceipt: { fare: number; vehicleName: string } | null;
  history: RideRecord[];

  setPickup: (p: Place) => void;
  setDestination: (p: Place | null) => Promise<void>;
  selectVehicle: (id: VehicleClass['id']) => void;
  setMethod: (id: string) => void;
  requestRide: () => Promise<void>;
  cancelRide: () => void;
  reset: () => void;
  rateLastRide: (stars: number) => Promise<void>;
  loadHistory: () => Promise<void>;
};

const HISTORY_KEY = 'ez2go.history';
let timers: ReturnType<typeof setTimeout>[] = [];
let ticker: ReturnType<typeof setInterval> | null = null;

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function quotesFor(distanceKm: number, durationMin: number): Quote[] {
  return VEHICLE_CLASSES.map((v) => ({
    vehicle: v,
    fare: estimateFare(v, distanceKm, durationMin),
  }));
}

export const useRide = create<RideState>((set, get) => ({
  status: 'idle',
  pickup: {
    id: 'current',
    name: 'Current location',
    address: 'Downtown, Kansas City, MO',
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
    kind: 'recent',
  },
  destination: null,
  route: [],
  distanceKm: 0,
  durationMin: 0,
  quotes: quotesFor(0, 0),
  selectedVehicleId: 'ezgo',
  methodId: 'pm_visa',
  driver: null,
  driverPos: null,
  pickupRoute: [],
  etaMin: 0,
  progress: 0,
  lastReceipt: null,
  history: [],

  setPickup(p) {
    set({ pickup: p });
  },

  async setDestination(p) {
    if (!p) {
      set({ destination: null, route: [], status: 'idle', quotes: quotesFor(0, 0) });
      return;
    }
    const pickup = get().pickup!;
    set({ destination: p, status: 'planning' });
    const r = await getRoute(pickup, p);
    set({
      route: r.coords,
      distanceKm: r.distanceKm,
      durationMin: r.durationMin,
      quotes: quotesFor(r.distanceKm, r.durationMin),
    });
  },

  selectVehicle(id) {
    set({ selectedVehicleId: id });
  },

  setMethod(id) {
    set({ methodId: id });
  },

  async requestRide() {
    const { pickup, destination, route } = get();
    if (!pickup || !destination) return;
    clearTimers();
    set({ status: 'searching', progress: 0 });

    // 1) match a driver
    timers.push(
      setTimeout(async () => {
        const driver = pickDriver();
        const start: LatLng = {
          lat: pickup.lat + 0.012,
          lng: pickup.lng - 0.014,
        };
        const toPickup = await getRoute(start, pickup);
        set({
          driver,
          status: 'arriving',
          pickupRoute: toPickup.coords,
          driverPos: start,
          etaMin: Math.max(1, Math.round(toPickup.durationMin)),
          progress: 0,
        });
        animateLeg(get, set, 'pickupRoute', 6500, () => {
          // 2) arrived at pickup
          set({ status: 'arrived', driverPos: pickup, progress: 0 });
          timers.push(
            setTimeout(() => {
              // 3) trip underway
              set({ status: 'in_progress', driverPos: pickup, progress: 0, etaMin: Math.round(get().durationMin) });
              animateLeg(get, set, 'route', 9000, () => {
                void completeRide(get, set);
              });
            }, 1800),
          );
        });
      }, 2000),
    );
  },

  cancelRide() {
    clearTimers();
    const { pickup, destination } = get();
    set({
      status: destination ? 'planning' : 'idle',
      driver: null,
      driverPos: null,
      pickupRoute: [],
      progress: 0,
    });
    void pickup; // keep pickup
  },

  reset() {
    clearTimers();
    set({
      status: 'idle',
      destination: null,
      route: [],
      distanceKm: 0,
      durationMin: 0,
      quotes: quotesFor(0, 0),
      driver: null,
      driverPos: null,
      pickupRoute: [],
      progress: 0,
      lastReceipt: null,
    });
  },

  async rateLastRide(stars) {
    const hist = get().history.slice();
    if (hist[0]) {
      hist[0] = { ...hist[0], rating: stars };
      set({ history: hist });
      await storage.setItem(HISTORY_KEY, JSON.stringify(hist));
    }
  },

  async loadHistory() {
    const raw = await storage.getItem(HISTORY_KEY);
    if (raw) {
      try {
        set({ history: JSON.parse(raw) as RideRecord[] });
      } catch {
        /* ignore */
      }
    }
  },
}));

function animateLeg(
  get: () => RideState,
  set: (p: Partial<RideState>) => void,
  legKey: 'route' | 'pickupRoute',
  durationMs: number,
  onDone: () => void,
) {
  const start = Date.now();
  // Capture the leg's total time once. Reading the (already-decremented) store
  // value each tick would compound (1 - t) into an exponential decay.
  const totalMin = legKey === 'pickupRoute' ? get().etaMin : get().durationMin;
  if (ticker) clearInterval(ticker);
  ticker = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / durationMs);
    const coords = get()[legKey];
    const pos = pointAlong(coords, t);
    const remaining = Math.max(0, Math.round(totalMin * (1 - t)));
    set({ driverPos: pos, progress: t, etaMin: remaining });
    if (t >= 1) {
      if (ticker) clearInterval(ticker);
      ticker = null;
      onDone();
    }
  }, 120);
}

async function completeRide(get: () => RideState, set: (p: Partial<RideState>) => void) {
  const s = get();
  const vehicle = s.quotes.find((q) => q.vehicle.id === s.selectedVehicleId)!;
  const fare = vehicle.fare.total;

  // Charge through the pluggable provider (mock today, Stripe tomorrow).
  try {
    await payments.charge({
      amount: fare,
      currency: 'USD',
      methodId: s.methodId,
      description: `Ez2go ${vehicle.vehicle.name} ride`,
    });
  } catch {
    /* mock never fails; ignore */
  }

  const record: RideRecord = {
    id: 'r_' + Math.random().toString(36).slice(2, 10),
    createdAt: new Date().toISOString(),
    pickup: s.pickup!,
    destination: s.destination!,
    vehicle: vehicle.vehicle.id,
    vehicleName: vehicle.vehicle.name,
    fare,
    distanceKm: s.distanceKm,
    durationMin: s.durationMin,
    driverName: s.driver?.name ?? 'Driver',
    status: 'completed',
  };
  const history = [record, ...get().history].slice(0, 50);
  await storage.setItem(HISTORY_KEY, JSON.stringify(history));
  set({
    status: 'completed',
    progress: 1,
    lastReceipt: { fare, vehicleName: vehicle.vehicle.name },
    history,
  });
}
