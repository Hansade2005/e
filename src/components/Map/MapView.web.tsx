import { useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { DEFAULT_CENTER, type LatLng } from '@/lib/geo';
import { colors } from '@/theme/tokens';
import type { MapProps } from './types';

function divIcon(html: string, size: [number, number], anchor?: [number, number]) {
  return L.divIcon({
    html,
    className: 'ez2go-marker',
    iconSize: size,
    iconAnchor: anchor ?? [size[0] / 2, size[1] / 2],
  });
}

const pickupIcon = divIcon(
  `<div style="width:18px;height:18px;border-radius:50%;background:${colors.jade};
    border:4px solid #fff;box-shadow:0 2px 8px rgba(14,23,38,.35)"></div>`,
  [18, 18],
);

const destIcon = divIcon(
  `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)">
     <div style="width:30px;height:30px;border-radius:50% 50% 50% 2px;transform:rotate(45deg);
       background:${colors.ink};border:3px solid #fff;box-shadow:0 4px 12px rgba(14,23,38,.4)"></div>
   </div>`,
  [30, 38],
  [15, 36],
);

const carIcon = divIcon(
  `<div style="width:30px;height:30px;border-radius:9px;background:${colors.ink};
     display:flex;align-items:center;justify-content:center;
     box-shadow:0 4px 12px rgba(14,23,38,.45);border:2px solid #fff">
     <span style="font-size:15px;line-height:1">🚗</span>
   </div>`,
  [30, 30],
);

const ghostCarIcon = divIcon(
  `<div style="width:24px;height:24px;border-radius:7px;background:${colors.inkSoft};
     display:flex;align-items:center;justify-content:center;opacity:.78;
     box-shadow:0 2px 6px rgba(14,23,38,.3)">
     <span style="font-size:12px;line-height:1">🚗</span>
   </div>`,
  [24, 24],
);

function Recenter({
  center,
  route,
  driverPos,
  follow,
}: {
  center: LatLng;
  route?: LatLng[];
  driverPos?: LatLng | null;
  follow?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    // Guard against Leaflet teardown races (panning a map mid-unmount throws
    // a harmless `_leaflet_pos` error).
    try {
      if (route && route.length > 1) {
        const bounds = L.latLngBounds(route.map((c) => [c.lat, c.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: false });
      } else {
        map.setView([center.lat, center.lng], 14, { animate: false });
      }
    } catch {
      /* map is unmounting */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(route), center.lat, center.lng]);

  useEffect(() => {
    try {
      if (follow && driverPos) {
        // Non-animated: the position updates every ~120ms anyway, and avoiding
        // the pan animation prevents async frames firing after unmount.
        map.panTo([driverPos.lat, driverPos.lng], { animate: false });
      }
    } catch {
      /* map is unmounting */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverPos?.lat, driverPos?.lng, follow]);

  return null;
}

export default function MapView({
  center = DEFAULT_CENTER,
  pickup,
  destination,
  route = [],
  pickupRoute = [],
  drivers = [],
  driverPos,
  followDriver,
}: MapProps) {
  const line = useMemo(() => route.map((c) => [c.lat, c.lng] as [number, number]), [route]);
  const pLine = useMemo(
    () => pickupRoute.map((c) => [c.lat, c.lng] as [number, number]),
    [pickupRoute],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      zoomControl={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%', background: '#e7eaef' }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <Recenter center={center} route={route} driverPos={driverPos} follow={followDriver} />

      {/* route line — the wayfinding motif, drawn with a soft casing */}
      {line.length > 1 && (
        <>
          <Polyline positions={line} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
          <Polyline
            positions={line}
            pathOptions={{ color: colors.ink, weight: 4.5, opacity: 1, lineCap: 'round' }}
          />
        </>
      )}
      {pLine.length > 1 && (
        <Polyline
          positions={pLine}
          pathOptions={{ color: colors.jade, weight: 4, opacity: 0.95, dashArray: '2 9', lineCap: 'round' }}
        />
      )}

      {drivers.map((d, i) => (
        <Marker key={`drv-${i}`} position={[d.lat, d.lng]} icon={ghostCarIcon} />
      ))}
      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
      {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon} />}
      {driverPos && <Marker position={[driverPos.lat, driverPos.lng]} icon={carIcon} />}
    </MapContainer>
  );
}
