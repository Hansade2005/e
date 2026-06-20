import { create } from 'zustand';
import {
  DEFAULT_CENTER,
  getCurrentLocation,
  getRoute,
  haversineKm,
  pointAlong,
  reverseGeocode,
  type LatLng,
  type Place,
} from '@/lib/geo';
import { estimateFare, formatMoney, VEHICLE_CLASSES, type Fare, type VehicleClass } from '@/constants/vehicles';
import { pickDriver, type DriverProfile, type GenderPref } from '@/constants/drivers';
import { payments } from '@/lib/payments';
import { storage } from '@/lib/storage';
import { fetchRidesRemote, saveRideRemote, updateRideRemote, isRemoteId } from '@/lib/db';
import { createRideRequest, pollRide, cancelRideRow, completeRideRow } from '@/lib/rides';
import { pollDriverLocation } from '@/lib/live';
import { useAuth } from '@/store/auth';
import { useNotifications } from '@/store/notifications';

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
  remoteId?: string; // rides.id once persisted to Supabase
};

type Quote = { vehicle: VehicleClass; fare: Fare };

export type ScheduledRide = {
  id: string;
  when: number; // epoch ms of requested pickup time
  pickup: Place;
  destination: Place;
  vehicle: VehicleClass['id'];
  vehicleName: string;
  fare: number;
};

type RideState = {
  status: RideStatus;
  pickup: Place | null;
  destination: Place | null;
  route: LatLng[];
  distanceKm: number;
  durationMin: number;
  quotes: Quote[];
  selectedVehicleId: VehicleClass['id'];
  driverGenderPref: GenderPref;
  methodId: string;
  scheduledAt: number | null; // null = ride now
  driver: DriverProfile | null;
  driverPos: LatLng | null;
  pickupRoute: LatLng[];
  etaMin: number;
  progress: number; // 0..1 along the active leg
  lastReceipt: { fare: number; vehicleName: string } | null;
  history: RideRecord[];
  scheduled: ScheduledRide[];
  liveRideId: string | null; // Supabase rides.id for live matching, when authed

  setPickup: (p: Place) => void;
  setPickupToCurrent: () => Promise<boolean>;
  setDestination: (p: Place | null) => Promise<void>;
  selectVehicle: (id: VehicleClass['id']) => void;
  setDriverGenderPref: (g: GenderPref) => void;
  setMethod: (id: string) => void;
  setScheduledAt: (t: number | null) => void;
  requestRide: () => Promise<void>;
  scheduleRide: () => Promise<void>;
  cancelScheduled: (id: string) => Promise<void>;
  cancelRide: () => void;
  reset: () => void;
  rateLastRide: (stars: number, tip?: number) => Promise<void>;
  loadHistory: () => Promise<void>;
};

const HISTORY_KEY = 'ez2go.history';
const SCHEDULED_KEY = 'ez2go.scheduled';
let timers: ReturnType<typeof setTimeout>[] = [];
let ticker: ReturnType<typeof setInterval> | null = null;
let liveStop: (() => void) | null = null;
let presenceStop: (() => void) | null = null;

// Stop only the local simulation (used when a real driver takes over).
function clearSim() {
  timers.forEach(clearTimeout);
  timers = [];
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function clearTimers() {
  clearSim();
  if (liveStop) {
    liveStop();
    liveStop = null;
  }
  if (presenceStop) {
    presenceStop();
    presenceStop = null;
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
  driverGenderPref: 'any',
  methodId: 'pm_visa',
  scheduledAt: null,
  driver: null,
  driverPos: null,
  pickupRoute: [],
  etaMin: 0,
  progress: 0,
  lastReceipt: null,
  history: [],
  scheduled: [],
  liveRideId: null,

  setPickup(p) {
    set({ pickup: p });
  },

  async setPickupToCurrent() {
    const loc = await getCurrentLocation();
    if (!loc) return false;
    const name =
      (await reverseGeocode(loc.lat, loc.lng)) ??
      `Near ${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`;
    set({
      pickup: { id: 'current', name, address: name, lat: loc.lat, lng: loc.lng, kind: 'recent' },
    });
    // Recompute the route/quotes if a destination is already chosen.
    const dest = get().destination;
    if (dest) await get().setDestination(dest);
    return true;
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

  setDriverGenderPref(g) {
    set({ driverGenderPref: g });
  },

  setMethod(id) {
    set({ methodId: id });
  },

  setScheduledAt(t) {
    set({ scheduledAt: t });
  },

  async scheduleRide() {
    const s = get();
    if (!s.pickup || !s.destination || !s.scheduledAt) return;
    const q = s.quotes.find((x) => x.vehicle.id === s.selectedVehicleId) ?? s.quotes[0];
    const entry: ScheduledRide = {
      id: 'sch_' + Math.random().toString(36).slice(2, 10),
      when: s.scheduledAt,
      pickup: s.pickup,
      destination: s.destination,
      vehicle: q.vehicle.id,
      vehicleName: q.vehicle.name,
      fare: q.fare.total,
    };
    const scheduled = [entry, ...s.scheduled].sort((a, b) => a.when - b.when);
    set({ scheduled });
    await storage.setItem(SCHEDULED_KEY, JSON.stringify(scheduled));
    await useNotifications.getState().push({
      icon: 'calendar',
      tone: 'jade',
      kind: 'scheduled',
      title: 'Ride scheduled',
      body: `${q.vehicle.name} to ${s.destination.name} · ${new Date(s.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`,
    });
    get().reset();
    set({ scheduledAt: null }); // back to "Now" for the next booking
  },

  async cancelScheduled(id) {
    const scheduled = get().scheduled.filter((s) => s.id !== id);
    set({ scheduled });
    await storage.setItem(SCHEDULED_KEY, JSON.stringify(scheduled));
  },

  async requestRide() {
    const { pickup, destination, route } = get();
    if (!pickup || !destination) return;
    clearTimers();
    set({ status: 'searching', progress: 0, liveRideId: null });

    // Publish a real ride request so an online driver can match (best-effort;
    // null for guest/offline). The local simulation below still drives the
    // rider's map/animation; if a real driver claims the row we adopt their
    // identity and chat goes live.
    const userId = useAuth.getState().user?.id;
    if (isRemoteId(userId)) {
      const q = get().quotes.find((x) => x.vehicle.id === get().selectedVehicleId) ?? get().quotes[0];
      const liveId = await createRideRequest({
        riderId: userId,
        pickup,
        destination,
        vehicleClass: get().selectedVehicleId,
        fare: q?.fare.total ?? 0,
        distanceKm: get().distanceKm,
        durationMin: get().durationMin,
        driverGenderPref: get().driverGenderPref,
      });
      if (liveId) {
        set({ liveRideId: liveId });
        let switched = false;
        liveStop = pollRide(liveId, (row) => {
          if (get().status === 'completed') return;
          if (row.status === 'cancelled') return;

          if (row.driverId && row.driverName) {
            // A real driver claimed the ride. Hand off from the simulation to
            // live tracking: stop the sim, follow the driver's real position.
            if (!switched) {
              switched = true;
              clearSim();
              if (presenceStop) presenceStop();
              presenceStop = pollDriverLocation(row.driverId, (loc) => {
                if (!loc) return;
                const st = get().status;
                const target = st === 'in_progress' ? get().destination : get().pickup;
                const eta = target
                  ? Math.max(1, Math.round((haversineKm(loc.pos, target) / 32) * 60))
                  : get().etaMin;
                set({ driverPos: loc.pos, etaMin: eta });
              });
            }
            set({
              driver: {
                id: row.driverId,
                name: row.driverName,
                rating: 4.95,
                trips: 0,
                car: row.driverVehicle ?? 'Vehicle',
                color: '',
                plate: row.driverPlate ?? '',
                avatarColor: '#00C2A8',
                gender: 'other',
              },
            });
          }

          // Mirror the status the real driver drives.
          if (row.status === 'arriving') set({ status: 'arriving' });
          else if (row.status === 'arrived') set({ status: 'arrived' });
          else if (row.status === 'in_progress') set({ status: 'in_progress' });
          else if (row.status === 'completed') {
            if (presenceStop) {
              presenceStop();
              presenceStop = null;
            }
            if (get().status !== 'completed') void completeRide(get, set);
          }
        });
      }
    }

    // 1) match a driver (local simulation / fallback)
    timers.push(
      setTimeout(async () => {
        const driver = pickDriver(get().driverGenderPref);
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
    const liveId = get().liveRideId;
    clearTimers();
    if (liveId) void cancelRideRow(liveId);
    const { pickup, destination } = get();
    set({
      status: destination ? 'planning' : 'idle',
      driver: null,
      driverPos: null,
      pickupRoute: [],
      progress: 0,
      liveRideId: null,
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
      liveRideId: null,
      // scheduledAt is a pickup-time preference — it survives reset() (which
      // runs on every home focus) and is cleared explicitly once a ride is booked.
    });
  },

  async rateLastRide(stars, tip = 0) {
    const hist = get().history.slice();
    if (hist[0]) {
      hist[0] = { ...hist[0], rating: stars };
      set({ history: hist });
      await storage.setItem(HISTORY_KEY, JSON.stringify(hist));
      // Reflect the tip + rating on the persisted ride.
      if (hist[0].remoteId) void updateRideRemote(hist[0].remoteId, { tip, rider_rating: stars });
    }
  },

  async loadHistory() {
    // Scheduled (upcoming) rides — local only, pruned of past entries.
    const schedRaw = await storage.getItem(SCHEDULED_KEY);
    if (schedRaw) {
      try {
        const all = JSON.parse(schedRaw) as ScheduledRide[];
        const upcoming = all.filter((s) => s.when > Date.now() - 3600_000);
        set({ scheduled: upcoming });
      } catch {
        /* ignore */
      }
    }
    // Local cache first for instant render…
    const raw = await storage.getItem(HISTORY_KEY);
    let local: RideRecord[] = [];
    if (raw) {
      try {
        local = JSON.parse(raw) as RideRecord[];
        set({ history: local });
      } catch {
        /* ignore */
      }
    }
    // …then reconcile with Supabase so trips appear across devices.
    const userId = useAuth.getState().user?.id;
    if (userId) {
      const remote = await fetchRidesRemote(userId);
      if (remote.length) {
        const merged = mergeHistory(remote, local);
        set({ history: merged });
        await storage.setItem(HISTORY_KEY, JSON.stringify(merged));
      }
    }
  },
}));

// Merge remote + local ride lists, de-duplicating on remoteId, newest first.
function mergeHistory(remote: RideRecord[], local: RideRecord[]): RideRecord[] {
  const byKey = new Map<string, RideRecord>();
  for (const r of remote) byKey.set(r.remoteId ?? r.id, r);
  for (const l of local) {
    const key = l.remoteId ?? l.id;
    if (!byKey.has(key)) byKey.set(key, l);
  }
  return Array.from(byKey.values())
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 50);
}

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

  void useNotifications.getState().push({
    icon: 'checkmark-circle',
    tone: 'jade',
    kind: 'ride',
    title: 'Trip complete',
    body: `${vehicle.vehicle.name} to ${record.destination.name} · ${formatMoney(fare)}`,
  });

  // Persist to Supabase. A live ride already has a row (created at request
  // time) — close it out; otherwise insert a completed record.
  const userId = useAuth.getState().user?.id;
  const liveId = s.liveRideId;
  if (liveId) {
    await completeRideRow(liveId, { fare });
    const next = get().history.map((r) => (r.id === record.id ? { ...r, remoteId: liveId } : r));
    set({ history: next });
    await storage.setItem(HISTORY_KEY, JSON.stringify(next));
  } else if (userId) {
    const remoteId = await saveRideRemote(record, userId);
    if (remoteId) {
      const next = get().history.map((r) => (r.id === record.id ? { ...r, remoteId } : r));
      set({ history: next });
      await storage.setItem(HISTORY_KEY, JSON.stringify(next));
    }
  }
}
