export type DriverProfile = {
  id: string;
  name: string;
  rating: number;
  trips: number;
  car: string;
  color: string;
  plate: string;
  avatarColor: string;
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
  },
];

export function pickDriver(): DriverProfile {
  return DRIVER_POOL[Math.floor(Math.random() * DRIVER_POOL.length)];
}
