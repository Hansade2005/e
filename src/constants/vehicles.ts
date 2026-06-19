export type VehicleClass = {
  id: 'ezgo' | 'ezxl' | 'ezpremium';
  name: string;
  tagline: string;
  seats: number;
  emoji: string; // lightweight glyph used on the picker
  // fare model
  base: number;
  perKm: number;
  perMin: number;
  minimum: number;
  multiplier: number; // relative premium
  etaMin: number;
};

export const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'ezgo',
    name: 'Ez Go',
    tagline: 'Affordable everyday rides',
    seats: 4,
    emoji: '🚗',
    base: 2.5,
    perKm: 0.95,
    perMin: 0.22,
    minimum: 6,
    multiplier: 1,
    etaMin: 3,
  },
  {
    id: 'ezxl',
    name: 'Ez XL',
    tagline: 'Room for the whole crew',
    seats: 6,
    emoji: '🚙',
    base: 3.5,
    perKm: 1.35,
    perMin: 0.3,
    minimum: 10,
    multiplier: 1.45,
    etaMin: 5,
  },
  {
    id: 'ezpremium',
    name: 'Ez Premium',
    tagline: 'Top-rated drivers, plush rides',
    seats: 4,
    emoji: '🚘',
    base: 5,
    perKm: 1.85,
    perMin: 0.45,
    minimum: 16,
    multiplier: 1.9,
    etaMin: 6,
  },
];

export type Fare = {
  total: number;
  base: number;
  distance: number;
  time: number;
  surge: number;
  currency: string;
};

export function estimateFare(
  v: VehicleClass,
  distanceKm: number,
  durationMin: number,
  surge = 1,
): Fare {
  const base = v.base;
  const distance = v.perKm * distanceKm;
  const time = v.perMin * durationMin;
  const raw = (base + distance + time) * surge;
  const total = Math.max(v.minimum, raw);
  return {
    total: round2(total),
    base: round2(base),
    distance: round2(distance),
    time: round2(time),
    surge,
    currency: 'USD',
  };
}

export function formatMoney(n: number): string {
  return '$' + n.toFixed(2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
