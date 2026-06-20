/**
 * Live ride matching over polling.
 *
 * A rider's request becomes a real `rides` row (status 'requested'); online
 * drivers poll for open requests and claim one; both sides then poll the row to
 * follow status changes. All guarded for remote (UUID) users — guests/offline
 * get null and the app's local simulation takes over.
 */
import { supabase } from './supabase';
import { isRemoteId } from './db';
import type { Place } from './geo';

export type RideRow = {
  id: string;
  status: string;
  riderId: string | null;
  driverId: string | null;
  driverName: string | null;
  driverVehicle: string | null;
  driverPlate: string | null;
  pickup: Place;
  destination: Place;
  vehicleClass: string;
  fare: number;
  distanceKm: number;
  durationMin: number;
  driverGenderPref: string;
  ridePrefs: string[];
};

function rowTo(r: any): RideRow {
  return {
    id: r.id,
    status: r.status,
    riderId: r.rider_id ?? null,
    driverId: r.driver_id ?? null,
    driverName: r.driver_name ?? null,
    driverVehicle: r.driver_vehicle ?? null,
    driverPlate: r.driver_plate ?? null,
    pickup: { id: 'p', name: r.pickup_name ?? 'Pickup', address: '', lat: r.pickup_lat, lng: r.pickup_lng },
    destination: { id: 'd', name: r.dest_name ?? 'Destination', address: '', lat: r.dest_lat, lng: r.dest_lng },
    vehicleClass: r.vehicle_class,
    driverGenderPref: r.driver_gender_pref ?? 'any',
    ridePrefs: r.ride_prefs ? String(r.ride_prefs).split(',').filter(Boolean) : [],
    fare: Number(r.fare ?? 0),
    distanceKm: Number(r.distance_km ?? 0),
    durationMin: Number(r.duration_min ?? 0),
  };
}

// ---------------------------------------------------------------- rider

export async function createRideRequest(input: {
  riderId: string;
  pickup: Place;
  destination: Place;
  vehicleClass: string;
  fare: number;
  distanceKm: number;
  durationMin: number;
  driverGenderPref?: string;
  ridePrefs?: string[];
  paymentMethodId?: string;
}): Promise<string | null> {
  if (!isRemoteId(input.riderId)) return null;
  try {
    const { data, error } = await supabase
      .from('rides')
      .insert({
        rider_id: input.riderId,
        status: 'requested',
        vehicle_class: input.vehicleClass,
        pickup_name: input.pickup.name,
        pickup_lat: input.pickup.lat,
        pickup_lng: input.pickup.lng,
        dest_name: input.destination.name,
        dest_lat: input.destination.lat,
        dest_lng: input.destination.lng,
        distance_km: round2(input.distanceKm),
        duration_min: round2(input.durationMin),
        fare: round2(input.fare),
        currency: 'USD',
        payment_status: 'pending',
        driver_gender_pref: input.driverGenderPref ?? 'any',
        ride_prefs: (input.ridePrefs ?? []).join(','),
        requested_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export async function fetchRide(rideId: string): Promise<RideRow | null> {
  if (!isRemoteId(rideId)) return null;
  try {
    const { data, error } = await supabase.from('rides').select('*').eq('id', rideId).single();
    if (error || !data) return null;
    return rowTo(data);
  } catch {
    return null;
  }
}

/** Poll a ride row, emitting it whenever status / driver assignment changes. */
export function pollRide(
  rideId: string,
  onChange: (row: RideRow) => void,
  intervalMs = 3000,
): () => void {
  if (!isRemoteId(rideId)) return () => {};
  let stopped = false;
  let last = '';
  const tick = async () => {
    if (stopped) return;
    const row = await fetchRide(rideId);
    if (stopped || !row) return;
    const sig = `${row.status}|${row.driverId ?? ''}`;
    if (sig !== last) {
      last = sig;
      onChange(row);
    }
  };
  void tick();
  const h = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(h);
  };
}

export async function cancelRideRow(rideId: string): Promise<void> {
  if (!isRemoteId(rideId)) return;
  try {
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId);
  } catch {
    /* ignore */
  }
}

export async function completeRideRow(
  rideId: string,
  patch: { fare?: number; tip?: number; rider_rating?: number },
): Promise<void> {
  if (!isRemoteId(rideId)) return;
  try {
    await supabase
      .from('rides')
      .update({
        status: 'completed',
        payment_status: 'paid',
        completed_at: new Date().toISOString(),
        ...patch,
      })
      .eq('id', rideId);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- driver

/** A rider's display name (profiles is publicly readable). */
export async function fetchRiderName(riderId: string | null): Promise<string | null> {
  if (!isRemoteId(riderId)) return null;
  try {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', riderId).single();
    return (data?.full_name as string) ?? null;
  } catch {
    return null;
  }
}

export async function fetchOpenRequests(driverGender?: string): Promise<RideRow[]> {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'requested')
      .is('driver_id', null)
      .order('requested_at', { ascending: false })
      .limit(10);
    if (error || !data) return [];
    return data
      .map(rowTo)
      // Only surface requests this driver is eligible for (rider's gender pref).
      .filter((r) => r.driverGenderPref === 'any' || r.driverGenderPref === driverGender);
  } catch {
    return [];
  }
}

export function pollOpenRequests(
  onUpdate: (rows: RideRow[]) => void,
  driverGender: string | undefined,
  intervalMs = 4000,
): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    const rows = await fetchOpenRequests(driverGender);
    if (!stopped) onUpdate(rows);
  };
  void tick();
  const h = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(h);
  };
}

/** Claim an open request. Returns true if this driver won it (still open). */
export async function claimRide(
  rideId: string,
  driverId: string,
  summary: { name: string; vehicle: string; plate: string },
): Promise<boolean> {
  if (!isRemoteId(rideId) || !isRemoteId(driverId)) return false;
  try {
    const { data, error } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'arriving',
        driver_name: summary.name,
        driver_vehicle: summary.vehicle,
        driver_plate: summary.plate,
      })
      .eq('id', rideId)
      .eq('status', 'requested')
      .is('driver_id', null)
      .select('id');
    return !error && !!data && data.length > 0;
  } catch {
    return false;
  }
}

/** The driver's rating of the rider (driver_rating column). */
export async function rateRiderRow(rideId: string, stars: number): Promise<void> {
  if (!isRemoteId(rideId)) return;
  try {
    await supabase.from('rides').update({ driver_rating: stars }).eq('id', rideId);
  } catch {
    /* ignore */
  }
}

export async function setRideStatus(rideId: string, status: string): Promise<void> {
  if (!isRemoteId(rideId)) return;
  try {
    const patch: Record<string, unknown> = { status };
    if (status === 'completed') {
      patch.completed_at = new Date().toISOString();
      patch.payment_status = 'paid';
    }
    await supabase.from('rides').update(patch).eq('id', rideId);
  } catch {
    /* ignore */
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
