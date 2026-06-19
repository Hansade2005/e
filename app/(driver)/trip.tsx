import { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapView } from '@/components/Map';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { useDriver } from '@/store/driver';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';

const PHASE_ACTION: Record<string, { label: string; sub: string }> = {
  to_pickup: { label: "I've arrived", sub: 'Head to the pickup point' },
  arrived: { label: 'Start trip', sub: 'Confirm your rider is in' },
  in_progress: { label: 'Complete trip', sub: 'Drive to the destination' },
};

export default function DriverTrip() {
  const insets = useSafeAreaInsets();
  const { phase, request, advance, finish } = useDriver();

  useEffect(() => {
    if (!request) router.replace('/(driver)/dashboard');
  }, [request]);

  if (!request) return null;

  const showRoute = phase === 'in_progress' ? request.tripRoute : request.pickupRoute;
  const target = phase === 'in_progress' ? request.destination : request.pickup;
  const action = PHASE_ACTION[phase];

  async function done() {
    await finish();
    // Pop back to the existing dashboard rather than stacking a new one.
    if (router.canGoBack()) router.back();
    else router.replace('/(driver)/dashboard');
  }

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <MapView
          center={target}
          pickup={request.pickup}
          destination={request.destination}
          route={phase === 'in_progress' ? request.tripRoute : []}
          pickupRoute={phase !== 'in_progress' ? request.pickupRoute : []}
          driverPos={showRoute[0]}
        />
      </View>

      <View style={[styles.navPill, { top: insets.top + space.sm }]}>
        <Ionicons name="navigate" size={16} color={colors.jade} />
        <Text variant="label" color={colors.onInk}>
          {phase === 'in_progress' ? 'To destination' : 'To pickup'} · {target.name}
        </Text>
      </View>

      {phase === 'completed' ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.completeWrap}>
            <View style={styles.completeCheck}>
              <Ionicons name="checkmark" size={30} color={colors.white} />
            </View>
            <Eyebrow color={colors.jade}>Trip complete</Eyebrow>
            <Text style={styles.payout}>{formatMoney(request.fare)}</Text>
            <Text variant="small" color={colors.onInkMuted}>
              Paid out in full. Ez2go took $0.00.
            </Text>
            <View style={styles.compare}>
              <Text variant="small" color={colors.onInkMuted}>
                On Uber/Lyft you&apos;d net ~{formatMoney(request.fare * 0.6)} after their cut.
              </Text>
            </View>
          </View>
          <Button label="Back to driving" variant="go" testID="driver-done" onPress={done} />
        </View>
      ) : (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grabber} />
          <View style={styles.riderRow}>
            <Avatar name={request.rider} color={colors.amber} size={48} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={colors.onInk}>
                {request.rider}
              </Text>
              <Text variant="small" color={colors.onInkMuted}>
                ★ {request.riderRating.toFixed(1)} · {formatMoney(request.fare)} fare
              </Text>
            </View>
            <Pressable style={styles.iconBtn} testID="driver-call">
              <Ionicons name="call" size={18} color={colors.onInk} />
            </Pressable>
            <Pressable style={styles.iconBtn} testID="driver-message">
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.onInk} />
            </Pressable>
          </View>

          <Text variant="small" color={colors.onInkMuted} style={{ marginBottom: space.md }}>
            {action?.sub}
          </Text>

          <Pressable
            testID="driver-advance"
            onPress={() => advance()}
            style={styles.advanceBtn}
          >
            <Text style={styles.advanceText}>{action?.label}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  navPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: space.lg,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.inkLine,
    maxWidth: '88%',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.inkLine,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    ...shadow.sheet,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.inkLine,
    marginBottom: space.lg,
  },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.jade,
  },
  advanceText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  completeWrap: { alignItems: 'center', gap: 6, marginBottom: space.xl },
  completeCheck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  payout: { fontFamily: fonts.monoBold, fontSize: 38, color: colors.onInk },
  compare: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
});
