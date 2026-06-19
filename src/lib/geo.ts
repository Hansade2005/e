/**
 * Geo utilities — all powered by free OpenStreetMap services.
 *   - Geocoding:  Nominatim  (https://nominatim.openstreetmap.org)
 *   - Routing:    OSRM demo  (https://router.project-osrm.org)
 *
 * Every network call degrades gracefully to a local computation so the app
 * stays fully usable offline and is deterministic under E2E tests.
 */

import * as Location from 'expo-location';

export type LatLng = { lat: number; lng: number };

export type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind?: 'home' | 'work' | 'recent' | 'search' | 'favorite';
};

// Default city center — Kansas City (matching the reference brand's home turf).
export const DEFAULT_CENTER: LatLng = { lat: 39.0997, lng: -94.5786 };

const R = 6371; // km

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/** Geocode a free-text query via Nominatim, with a curated local fallback. */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=' +
      encodeURIComponent(q);
    const res = await fetchWithTimeout(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Ez2go/1.0 (demo app)' },
    });
    if (!res.ok) throw new Error('nominatim');
    const data: any[] = await res.json();
    if (Array.isArray(data) && data.length) {
      return data.map((d, i) => ({
        id: String(d.place_id ?? i),
        name: shortName(d.display_name),
        address: d.display_name as string,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        kind: 'search' as const,
      }));
    }
  } catch {
    // fall through to local results
  }
  return localPlaces.filter((p) =>
    (p.name + ' ' + p.address).toLowerCase().includes(q.toLowerCase()),
  );
}

function shortName(displayName: string): string {
  return displayName.split(',').slice(0, 2).join(',').trim();
}

/** The device's current position, or null if unavailable / denied. */
export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Reverse-geocode a point to a short readable address via Nominatim. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetchWithTimeout(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Ez2go/1.0 (demo app)' },
    });
    if (!res.ok) throw new Error('reverse');
    const d = await res.json();
    return d?.display_name ? shortName(d.display_name) : null;
  } catch {
    return null;
  }
}

/** Road route geometry between two points via OSRM, with a straight-line fallback. */
export async function getRoute(
  from: LatLng,
  to: LatLng,
): Promise<{ coords: LatLng[]; distanceKm: number; durationMin: number }> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('osrm');
    const data = await res.json();
    const route = data?.routes?.[0];
    if (route) {
      const coords: LatLng[] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({ lat, lng }),
      );
      return {
        coords,
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      };
    }
  } catch {
    // fall through
  }
  // Fallback: an L-shaped route (mirrors the wayfinding "route line" motif).
  const mid: LatLng = { lat: from.lat, lng: to.lng };
  const distanceKm = haversineKm(from, to) * 1.3;
  return {
    coords: [from, mid, to],
    distanceKm,
    durationMin: (distanceKm / 32) * 60, // ~32 km/h city avg
  };
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/** Scatter N driver markers in a small radius around a point. */
export function nearbyDrivers(center: LatLng, count = 6): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const seed = (i + 1) * 1.37;
    out.push({
      lat: center.lat + Math.sin(seed) * 0.006 * ((i % 3) + 1) * 0.6,
      lng: center.lng + Math.cos(seed) * 0.008 * ((i % 4) + 1) * 0.5,
    });
  }
  return out;
}

/** Interpolate a point fraction t (0..1) along a polyline. */
export function pointAlong(coords: LatLng[], t: number): LatLng {
  if (coords.length === 0) return DEFAULT_CENTER;
  if (coords.length === 1) return coords[0];
  const clamped = Math.max(0, Math.min(1, t));
  // total length
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineKm(coords[i - 1], coords[i]);
    segs.push(d);
    total += d;
  }
  let target = clamped * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const f = segs[i] === 0 ? 0 : target / segs[i];
      return {
        lat: coords[i].lat + (coords[i + 1].lat - coords[i].lat) * f,
        lng: coords[i].lng + (coords[i + 1].lng - coords[i].lng) * f,
      };
    }
    target -= segs[i];
  }
  return coords[coords.length - 1];
}

// A few well-known KC destinations for the offline fallback + quick suggestions.
export const localPlaces: Place[] = [
  {
    id: 'l1',
    name: 'Kansas City Intl Airport (MCI)',
    address: '1 Kansas City Blvd, Kansas City, MO',
    lat: 39.2976,
    lng: -94.7139,
  },
  {
    id: 'l2',
    name: 'Union Station',
    address: '30 W Pershing Rd, Kansas City, MO',
    lat: 39.0844,
    lng: -94.5853,
  },
  {
    id: 'l3',
    name: 'Power & Light District',
    address: '1357 Grand Blvd, Kansas City, MO',
    lat: 39.0976,
    lng: -94.5829,
  },
  {
    id: 'l4',
    name: 'City Market',
    address: '20 E 5th St, Kansas City, MO',
    lat: 39.1093,
    lng: -94.5829,
  },
  {
    id: 'l5',
    name: 'Nelson-Atkins Museum of Art',
    address: '4525 Oak St, Kansas City, MO',
    lat: 39.0451,
    lng: -94.5814,
  },
  {
    id: 'l6',
    name: 'Country Club Plaza',
    address: '4750 Broadway Blvd, Kansas City, MO',
    lat: 39.0419,
    lng: -94.5917,
  },
];
