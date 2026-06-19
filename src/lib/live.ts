/**
 * Poll-based "live" layer — chat messages and driver presence.
 *
 * Deliberately NOT Supabase Realtime: clients poll on an interval so there are
 * no persistent connections to bill for. Every call is best-effort and a no-op
 * for guest/offline sessions (non-UUID ids), so the simulated demo keeps working
 * unchanged while real signed-in sessions sync through Supabase.
 */
import { supabase } from './supabase';
import { isRemoteId } from './db';
import type { LatLng } from './geo';

export type ChatMessage = {
  id: string;
  rideId: string | null;
  senderId: string;
  senderRole: 'rider' | 'driver';
  body: string;
  createdAt: string;
};

function rowToMessage(r: any): ChatMessage {
  return {
    id: r.id,
    rideId: r.ride_id ?? null,
    senderId: r.sender_id,
    senderRole: (r.sender_role ?? 'rider') as 'rider' | 'driver',
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function sendMessage(input: {
  rideId: string;
  senderId: string;
  senderRole: 'rider' | 'driver';
  body: string;
}): Promise<ChatMessage | null> {
  if (!isRemoteId(input.rideId) || !isRemoteId(input.senderId)) return null;
  try {
    const { data } = await supabase
      .from('messages')
      .insert({
        ride_id: input.rideId,
        sender_id: input.senderId,
        sender_role: input.senderRole,
        body: input.body,
      })
      .select('*')
      .single();
    return data ? rowToMessage(data) : null;
  } catch {
    return null;
  }
}

export async function fetchMessages(rideId: string, sinceISO?: string): Promise<ChatMessage[]> {
  if (!isRemoteId(rideId)) return [];
  try {
    let q = supabase
      .from('messages')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (sinceISO) q = q.gt('created_at', sinceISO);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(rowToMessage);
  } catch {
    return [];
  }
}

/**
 * Poll a ride's messages, emitting only ones newer than the last seen. Returns
 * a stop() function. No-op (returns a noop stopper) for non-remote rides.
 */
export function pollMessages(
  rideId: string,
  onNew: (msgs: ChatMessage[]) => void,
  intervalMs = 3000,
): () => void {
  if (!isRemoteId(rideId)) return () => {};
  let since: string | undefined;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const msgs = await fetchMessages(rideId, since);
    if (stopped) return;
    if (msgs.length) {
      since = msgs[msgs.length - 1].createdAt;
      onNew(msgs);
    }
  };

  void tick(); // prime immediately
  const handle = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(handle);
  };
}

// ---------------------------------------------------------------- presence

export type OnlineDriver = { id: string; pos: LatLng; heading?: number; updatedAt: string };

/** Driver upserts their position + online flag (call on an interval while online). */
export async function publishPresence(input: {
  driverId: string;
  pos?: LatLng;
  heading?: number;
  online: boolean;
}): Promise<void> {
  if (!isRemoteId(input.driverId)) return;
  try {
    await supabase.from('driver_locations').upsert(
      {
        id: input.driverId,
        lat: input.pos?.lat,
        lng: input.pos?.lng,
        heading: input.heading,
        is_online: input.online,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch {
    /* best-effort */
  }
}

/** Fetch drivers seen online within the last `freshSeconds`. */
export async function fetchOnlineDrivers(freshSeconds = 30): Promise<OnlineDriver[]> {
  try {
    const cutoff = new Date(Date.now() - freshSeconds * 1000).toISOString();
    const { data, error } = await supabase
      .from('driver_locations')
      .select('id, lat, lng, heading, updated_at')
      .eq('is_online', true)
      .gt('updated_at', cutoff)
      .limit(50);
    if (error || !data) return [];
    return data
      .filter((r: any) => r.lat != null && r.lng != null)
      .map((r: any) => ({
        id: r.id,
        pos: { lat: r.lat, lng: r.lng },
        heading: r.heading ?? undefined,
        updatedAt: r.updated_at,
      }));
  } catch {
    return [];
  }
}

/** One driver's latest known location (for tracking a matched driver). */
export async function fetchDriverLocation(driverId: string): Promise<OnlineDriver | null> {
  if (!isRemoteId(driverId)) return null;
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('id, lat, lng, heading, updated_at')
      .eq('id', driverId)
      .single();
    if (error || !data || data.lat == null || data.lng == null) return null;
    return {
      id: data.id,
      pos: { lat: data.lat, lng: data.lng },
      heading: data.heading ?? undefined,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

/** Poll a specific driver's location on an interval. Returns stop(). */
export function pollDriverLocation(
  driverId: string,
  onUpdate: (loc: OnlineDriver | null) => void,
  intervalMs = 3000,
): () => void {
  if (!isRemoteId(driverId)) return () => {};
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    const loc = await fetchDriverLocation(driverId);
    if (!stopped) onUpdate(loc);
  };
  void tick();
  const h = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(h);
  };
}

/** Poll online drivers on an interval. Returns stop(). */
export function pollOnlineDrivers(
  onUpdate: (drivers: OnlineDriver[]) => void,
  intervalMs = 6000,
): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    const drivers = await fetchOnlineDrivers();
    if (!stopped) onUpdate(drivers);
  };
  void tick();
  const handle = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(handle);
  };
}
