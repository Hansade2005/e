import type { LatLng } from '@/lib/geo';

export type MapProps = {
  center?: LatLng;
  pickup?: LatLng | null;
  destination?: LatLng | null;
  route?: LatLng[];
  pickupRoute?: LatLng[];
  drivers?: LatLng[];
  driverPos?: LatLng | null;
  followDriver?: boolean;
};
