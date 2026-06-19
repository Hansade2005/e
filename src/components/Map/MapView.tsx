import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';
import type { MapProps } from './types';

/**
 * Native fallback. The web build (MapView.web.tsx) renders a full Leaflet/OSM
 * map; for a production native build, drop in `react-native-maps` with an OSM
 * UrlTile here using the same props. This keeps the native bundle dependency-free
 * while the web target — used for E2E — gets the real map.
 */
export default function MapView({ pickup, destination }: MapProps) {
  return (
    <View style={styles.fill}>
      <View style={styles.grid} />
      {pickup && <View style={[styles.dot, { backgroundColor: colors.jade }]} />}
      {destination && <View style={[styles.pin, { backgroundColor: colors.ink }]} />}
      <Text variant="label" color={colors.textMuted} style={styles.note}>
        OpenStreetMap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#e7eaef', overflow: 'hidden' },
  grid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 },
  dot: { position: 'absolute', top: '46%', left: '40%', width: 18, height: 18, borderRadius: 9, borderColor: '#fff', borderWidth: 3 },
  pin: { position: 'absolute', top: '32%', left: '62%', width: 22, height: 22, borderRadius: 11 },
  note: { position: 'absolute', bottom: 8, left: 10 },
});
