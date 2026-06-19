import { useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapView } from '@/components/Map';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stars } from '@/components/ui/Stars';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';
import { useRide } from '@/store/ride';

const STATUS_COPY: Record<string, { eyebrow: string; title: string }> = {
  searching: { eyebrow: 'Matching', title: 'Finding your driver…' },
  arriving: { eyebrow: 'On the way', title: 'Your driver is heading over' },
  arrived: { eyebrow: 'Arrived', title: 'Your driver is here' },
  in_progress: { eyebrow: 'En route', title: 'Enjoy the ride' },
};

export default function Tracking() {
  const insets = useSafeAreaInsets();
  const status = useRide((s) => s.status);
  const pickup = useRide((s) => s.pickup);
  const destination = useRide((s) => s.destination);
  const route = useRide((s) => s.route);
  const pickupRoute = useRide((s) => s.pickupRoute);
  const driver = useRide((s) => s.driver);
  const driverPos = useRide((s) => s.driverPos);
  const etaMin = useRide((s) => s.etaMin);
  const cancelRide = useRide((s) => s.cancelRide);

  useEffect(() => {
    // Hand off to the receipt once the trip finishes. Cancellation navigates
    // explicitly from its handler, so we don't react to idle/planning here
    // (that would race the finish flow and blank the screen).
    if (status === 'completed') {
      router.replace('/(rider)/complete');
    }
  }, [status]);

  const copy = STATUS_COPY[status] ?? STATUS_COPY.searching;
  const activeLeg = status === 'in_progress' ? route : pickupRoute;

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <MapView
          center={pickup ?? undefined}
          pickup={pickup}
          destination={destination}
          route={status === 'in_progress' ? route : []}
          pickupRoute={status === 'arriving' ? pickupRoute : []}
          driverPos={driverPos}
          followDriver={status === 'arriving' || status === 'in_progress'}
        />
      </View>

      <View style={[styles.topbar, { top: insets.top + space.sm }]}>
        <View style={styles.statusPill}>
          {status === 'searching' ? (
            <ActivityIndicator size="small" color={colors.jade} />
          ) : (
            <View style={styles.pulse} />
          )}
          <Text variant="label" color={colors.onInk}>
            {copy.eyebrow}
          </Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />

        {/* ETA strip */}
        <View style={styles.etaStrip}>
          <View>
            <Text variant="label" color={colors.textSecondary}>
              {status === 'in_progress' ? 'Arriving in' : status === 'arrived' ? 'Status' : 'Pickup in'}
            </Text>
            <Text style={styles.etaValue}>
              {status === 'arrived' ? 'Here' : status === 'searching' ? '—' : `${etaMin} min`}
            </Text>
          </View>
          <View style={styles.legProgress}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {copy.title}
            </Text>
            <Text variant="small" color={colors.textSecondary} numberOfLines={1}>
              {status === 'in_progress'
                ? `To ${destination?.name}`
                : `Pickup at ${pickup?.name}`}
            </Text>
          </View>
        </View>

        {/* driver card */}
        {driver ? (
          <View style={styles.driverCard}>
            <Avatar name={driver.name} color={driver.avatarColor} size={52} />
            <View style={{ flex: 1 }}>
              <View style={styles.driverNameRow}>
                <Text variant="bodyStrong">{driver.name}</Text>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={11} color={colors.amber} />
                  <Text variant="label" color={colors.ink}>
                    {driver.rating.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text variant="small" color={colors.textSecondary}>
                {driver.color} {driver.car}
              </Text>
            </View>
            <View style={styles.plate}>
              <Text style={styles.plateText}>{driver.plate}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.searchingBox}>
            <Stars value={5} size={14} color={colors.jade} />
            <Text variant="small" color={colors.textSecondary}>
              Pinging top-rated drivers near {pickup?.name}…
            </Text>
          </View>
        )}

        {/* actions */}
        {driver ? (
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} testID="contact-driver">
              <Ionicons name="call" size={18} color={colors.ink} />
              <Text variant="smallStrong">Call</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} testID="message-driver">
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.ink} />
              <Text variant="smallStrong">Message</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} testID="share-trip">
              <Ionicons name="shield-checkmark" size={18} color={colors.ink} />
              <Text variant="smallStrong">Safety</Text>
            </Pressable>
          </View>
        ) : null}

        {status !== 'in_progress' && status !== 'arrived' ? (
          <Pressable
            style={styles.cancel}
            testID="cancel-ride"
            onPress={() => {
              cancelRide();
              router.replace('/(rider)/home');
            }}
          >
            <Text variant="smallStrong" color={colors.danger}>
              Cancel ride
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  topbar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: space.lg,
    height: 40,
    borderRadius: radius.pill,
    ...shadow.float,
  },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.jade },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    ...shadow.sheet,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    marginBottom: space.lg,
  },
  etaStrip: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.lg },
  etaValue: { fontFamily: fonts.monoBold, fontSize: 26, color: colors.ink },
  legProgress: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.surfaceAlt, paddingLeft: space.lg },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.canvas,
    borderRadius: radius.lg,
    padding: space.md,
  },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: radius.pill,
  },
  plate: {
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  plateText: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.onInk, letterSpacing: 1 },
  searchingBox: {
    backgroundColor: colors.canvas,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  actionRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    height: 46,
    borderRadius: radius.md,
  },
  cancel: { alignSelf: 'center', paddingVertical: space.md, marginTop: space.xs },
});
