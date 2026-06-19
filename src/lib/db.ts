/**
 * Supabase data access for rides and saved places.
 *
 * Every function is best-effort: callers always keep a local copy and treat the
 * network as an enhancement. Remote writes only run for a real Supabase-authed
 * user (a UUID id) — guest/offline sessions stay purely local so nothing trips
 * Row Level Security or the profiles foreign key.
 */
import { supabase } from './supabase';
import type { Place } from './geo';
import type { RideRecord } from '@/store/ride';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRemoteId(id: string | undefined | null): id is string {
  return !!id && UUID_RE.test(id);
}

// ---------------------------------------------------------------- rides

export async function saveRideRemote(
  record: RideRecord,
  riderId: string,
  tip = 0,
): Promise<string | undefined> {
  if (!isRemoteId(riderId)) return undefined;
  try {
    const { data } = await supabase
      .from('rides')
      .insert({
        rider_id: riderId,
        status: 'completed',
        vehicle_class: record.vehicle,
        pickup_name: record.pickup.name,
        pickup_lat: record.pickup.lat,
        pickup_lng: record.pickup.lng,
        dest_name: record.destination.name,
        dest_lat: record.destination.lat,
        dest_lng: record.destination.lng,
        distance_km: round2(record.distanceKm),
        duration_min: round2(record.durationMin),
        fare: record.fare,
        tip,
        currency: 'USD',
        payment_status: 'paid',
        rider_rating: record.rating ?? null,
        requested_at: record.createdAt,
        completed_at: record.createdAt,
      })
      .select('id')
      .single();
    return data?.id as string | undefined;
  } catch {
    return undefined; // offline-friendly
  }
}

export async function updateRideRemote(
  rideId: string,
  patch: { tip?: number; rider_rating?: number },
): Promise<void> {
  if (!isRemoteId(rideId)) return;
  try {
    await supabase.from('rides').update(patch).eq('id', rideId);
  } catch {
    /* ignore */
  }
}

export async function fetchRidesRemote(riderId: string): Promise<RideRecord[]> {
  if (!isRemoteId(riderId)) return [];
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('rider_id', riderId)
      .order('completed_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map(rowToRecord);
  } catch {
    return [];
  }
}

function rowToRecord(r: any): RideRecord {
  return {
    id: r.id,
    createdAt: r.completed_at ?? r.requested_at ?? new Date().toISOString(),
    pickup: { id: 'p', name: r.pickup_name ?? 'Pickup', address: '', lat: r.pickup_lat, lng: r.pickup_lng },
    destination: { id: 'd', name: r.dest_name ?? 'Destination', address: '', lat: r.dest_lat, lng: r.dest_lng },
    vehicle: r.vehicle_class,
    vehicleName: vehicleName(r.vehicle_class),
    fare: Number(r.fare ?? 0),
    distanceKm: Number(r.distance_km ?? 0),
    durationMin: Number(r.duration_min ?? 0),
    driverName: 'Driver',
    rating: r.rider_rating ?? undefined,
    status: 'completed',
  };
}

function vehicleName(id: string): string {
  return id === 'ezxl' ? 'Ez XL' : id === 'ezpremium' ? 'Ez Premium' : 'Ez Go';
}

// ---------------------------------------------------------------- saved places

export type SavedPlace = Omit<Place, 'kind'> & {
  dbId?: string; // uuid in saved_places, when persisted
  kind: 'home' | 'work' | 'favorite';
};

export async function fetchSavedPlacesRemote(userId: string): Promise<SavedPlace[]> {
  if (!isRemoteId(userId)) return [];
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      dbId: r.id,
      kind: (r.kind ?? 'favorite') as SavedPlace['kind'],
      name: r.name,
      address: r.address ?? '',
      lat: r.lat,
      lng: r.lng,
    }));
  } catch {
    return [];
  }
}

export async function upsertSavedPlaceRemote(
  userId: string,
  place: SavedPlace,
): Promise<string | undefined> {
  if (!isRemoteId(userId)) return undefined;
  try {
    // One row per (user, kind) for home/work; favorites can repeat.
    if (place.kind !== 'favorite') {
      await supabase.from('saved_places').delete().eq('user_id', userId).eq('kind', place.kind);
    }
    const { data } = await supabase
      .from('saved_places')
      .insert({
        user_id: userId,
        kind: place.kind,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      })
      .select('id')
      .single();
    return data?.id as string | undefined;
  } catch {
    return undefined;
  }
}

export async function deleteSavedPlaceRemote(dbId: string): Promise<void> {
  if (!isRemoteId(dbId)) return;
  try {
    await supabase.from('saved_places').delete().eq('id', dbId);
  } catch {
    /* ignore */
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
