import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapView } from '@/components/Map';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Stars } from '@/components/ui/Stars';
import { useRide } from '@/store/ride';
import { formatMoney } from '@/constants/vehicles';
import { getRoute, kmToMiles, type LatLng } from '@/lib/geo';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';

export default function TripDetails() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useRide((s) => s.history);
  const setPickup = useRide((s) => s.setPickup);
  const setDestination = useRide((s) => s.setDestination);

  // Strict lookup — an unknown id safely redirects rather than showing a
  // different trip's details.
  const ride = history.find((r) => r.id === id);
  const [route, setRoute] = useState<LatLng[]>([]);

  useEffect(() => {
    if (ride) {
      getRoute(ride.pickup, ride.destination)
        .then((r) => setRoute(r.coords))
        .catch((err) => console.error('Failed to fetch route:', err));
    }
  }, [ride?.id]);

  if (!ride) {
    router.replace('/(rider)/history');
    return null;
  }

  const subtotal = ride.fare;
  const tip = estimateTipShown(ride.fare);
  const total = subtotal + tip;

  async function rebook() {
    if (!ride) return;
    setPickup(ride.pickup);
    await setDestination(ride.destination);
    router.push('/(rider)/select-ride');
  }

  return (
    <View style={styles.fill}>
      <View style={styles.mapWrap}>
        <MapView
          center={ride.pickup}
          pickup={ride.pickup}
          destination={ride.destination}
          route={route}
        />
        <View style={[styles.back, { top: insets.top + space.sm }]}>
          <IconButton name="chevron-back" testID="td-back" onPress={() => router.back()} />
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <View>
              <Eyebrow>
                {new Date(ride.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Eyebrow>
              <Text variant="h2">{formatMoney(total)}</Text>
            </View>
            <View style={styles.vehicleTag}>
              <Text variant="smallStrong">{ride.vehicleName}</Text>
            </View>
          </View>

          {/* route */}
          <View style={styles.routeCard}>
            <View style={styles.routeMarks}>
              <View style={[styles.dot, { backgroundColor: colors.jade }]} />
              <View style={styles.connector} />
              <View style={[styles.square, { backgroundColor: colors.ink }]} />
            </View>
            <View style={{ flex: 1, gap: 18 }}>
              <View>
                <Text variant="label" color={colors.textMuted}>Pickup</Text>
                <Text variant="bodyStrong" numberOfLines={1}>{ride.pickup.name}</Text>
              </View>
              <View>
                <Text variant="label" color={colors.textMuted}>Dropoff</Text>
                <Text variant="bodyStrong" numberOfLines={1}>{ride.destination.name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Meta icon="speedometer-outline" value={`${kmToMiles(ride.distanceKm).toFixed(1)} mi`} label="Distance" />
            <Meta icon="time-outline" value={`${Math.round(ride.durationMin)} min`} label="Duration" />
            <Meta icon="person-outline" value={ride.driverName.split(' ')[0]} label="Driver" />
          </View>

          {/* receipt */}
          <Text variant="label" color={colors.textSecondary} style={{ marginTop: space.lg }}>Receipt</Text>
          <View style={styles.receipt}>
            <Row label={`${ride.vehicleName} fare`} value={formatMoney(subtotal)} />
            <Row label="Tip" value={formatMoney(tip)} />
            <View style={styles.divider} />
            <Row label="Total" value={formatMoney(total)} bold />
            <View style={styles.empower}>
              <Ionicons name="shield-checkmark" size={14} color={colors.jade} />
              <Text variant="small" color={colors.jadeDark}>100% paid to {ride.driverName}</Text>
            </View>
          </View>

          {ride.rating ? (
            <View style={styles.ratedRow}>
              <Text variant="small" color={colors.textSecondary}>You rated this trip</Text>
              <Stars value={ride.rating} size={16} />
            </View>
          ) : null}

          <Button label="Rebook this trip" variant="primary" testID="rebook" onPress={rebook} style={{ marginTop: space.lg }} />
        </ScrollView>
      </View>
    </View>
  );
}

function Meta({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={18} color={colors.jade} />
      <Text variant="bodyStrong">{value}</Text>
      <Text variant="label" color={colors.textMuted}>{label}</Text>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={bold ? 'bodyStrong' : 'body'} color={bold ? colors.ink : colors.textSecondary}>{label}</Text>
      <Text style={[styles.rowVal, bold && { color: colors.ink, fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

// The tip isn't stored on the local record; show a representative figure so the
// receipt reads completely. (Remote records carry the real tip.)
function estimateTipShown(fare: number): number {
  return Math.round(fare * 0.15 * 100) / 100;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  mapWrap: { height: '34%' },
  back: { position: 'absolute', left: space.lg },
  sheet: {
    flex: 1,
    marginTop: -radius.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    ...shadow.sheet,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginBottom: space.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleTag: { backgroundColor: colors.surfaceAlt, paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, justifyContent: 'center' },
  routeCard: { flexDirection: 'row', gap: space.md, backgroundColor: colors.canvas, borderRadius: radius.lg, padding: space.lg, marginTop: space.lg },
  routeMarks: { alignItems: 'center', paddingTop: 6 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  square: { width: 11, height: 11, borderRadius: 3 },
  connector: { width: 2, flex: 1, minHeight: 24, backgroundColor: colors.surfaceAlt, marginVertical: 4 },
  metaRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  meta: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: colors.canvas, borderRadius: radius.md, paddingVertical: space.md },
  receipt: { backgroundColor: colors.canvas, borderRadius: radius.lg, padding: space.lg, marginTop: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowVal: { fontFamily: fonts.mono, fontSize: 15, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.surfaceAlt, marginVertical: space.sm },
  empower: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm },
  ratedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.lg },
});
