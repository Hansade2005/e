export type Gender = 'female' | 'male' | 'other';
export type GenderPref = 'any' | 'female' | 'male';

export type DriverProfile = {
  id: string;
  name: string;
  rating: number;
  trips: number;
  car: string;
  color: string;
  plate: string;
  avatarColor: string;
  gender: Gender;
};

export const DRIVER_POOL: DriverProfile[] = [
  {
    id: 'd1',
    name: 'Marcus Bell',
    rating: 4.96,
    trips: 5821,
    car: 'Toyota Prius',
    color: 'Silver',
    plate: 'EZ-4821',
    avatarColor: '#00C2A8',
    gender: 'male',
  },
  {
    id: 'd2',
    name: 'Aaliyah Reed',
    rating: 4.99,
    trips: 8120,
    car: 'Honda CR-V',
    color: 'Graphite',
    plate: 'EZ-7733',
    avatarColor: '#FF8A3D',
    gender: 'female',
  },
  {
    id: 'd3',
    name: 'Diego Marin',
    rating: 4.91,
    trips: 3402,
    car: 'Chevy Malibu',
    color: 'Black',
    plate: 'EZ-1190',
    avatarColor: '#7A5BD6',
    gender: 'male',
  },
  {
    id: 'd4',
    name: 'Sofia Nguyen',
    rating: 4.98,
    trips: 6740,
    car: 'Kia Niro',
    color: 'Pearl',
    plate: 'EZ-5508',
    avatarColor: '#1FB57A',
    gender: 'female',
  },
];

/** Pick a driver, honoring the rider's gender preference when possible. */
export function pickDriver(pref: GenderPref = 'any'): DriverProfile {
  const pool =
    pref === 'any' ? DRIVER_POOL : DRIVER_POOL.filter((d) => d.gender === pref);
  const list = pool.length ? pool : DRIVER_POOL;
  return list[Math.floor(Math.random() * list.length)];
}

export const GENDER_PREFS: { id: GenderPref; label: string; icon: string }[] = [
  { id: 'any', label: 'Any driver', icon: 'people' },
  { id: 'female', label: 'Women', icon: 'female' },
  { id: 'male', label: 'Men', icon: 'male' },
];
