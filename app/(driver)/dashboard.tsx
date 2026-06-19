import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapView } from '@/components/Map';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useAuth } from '@/store/auth';
import { useDriver, DRIVER_HOME } from '@/store/driver';
import { nearbyDrivers } from '@/lib/geo';
import { publishPresence } from '@/lib/live';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const switchRole = useAuth((s) => s.switchRole);
  const {
    phase,
    online,
    request,
    earningsToday,
    tripsToday,
    goOnline,
    goOffline,
    accept,
    decline,
    load,
  } = useDriver();

  useEffect(() => {
    load();
  }, [load]);

  // Presence: while online, broadcast position to driver_locations on an
  // interval (poll-based — no Realtime). No-op for guest/offline sessions.
  useEffect(() => {
    const driverId = user?.id;
    if (!driverId) return;
    if (!online) {
      void publishPresence({ driverId, online: false });
      return;
    }
    void publishPresence({ driverId, pos: DRIVER_HOME, online: true });
    const handle = setInterval(() => {
      void publishPresence({ driverId, pos: DRIVER_HOME, online: true });
    }, 8000);
    return () => {
      clearInterval(handle);
      void publishPresence({ driverId, online: false });
    };
  }, [online, user?.id]);

  const riders = useMemo(() => nearbyDrivers(DRIVER_HOME, 5), []);

  function onAccept() {
    accept();
    router.push('/(driver)/trip');
  }

  async function toRider() {
    await switchRole('rider');
    router.replace('/(rider)/home');
  }

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <MapView center={DRIVER_HOME} pickup={online ? DRIVER_HOME : null} drivers={online ? riders : []} />
        <View style={styles.mapTint} pointerEvents="none" />
      </View>

      {/* top bar */}
      <View style={[styles.topbar, { top: insets.top + space.sm }]}>
        <View style={styles.brandPill}>
          <Logo size={18} />
        </View>
        <Pressable onPress={toRider} testID="switch-to-rider">
          <Avatar name={user?.name ?? 'Driver'} color={user?.avatarColor} size={44} />
        </Pressable>
      </View>

      {/* status banner */}
      <View style={[styles.statusBanner, { top: insets.top + 70 }]}>
        <View style={[styles.statusDot, { backgroundColor: online ? colors.jade : colors.textMuted }]} />
        <Text variant="label" color={colors.onInk}>
          {online ? 'You are online' : 'You are offline'}
        </Text>
      </View>

      {/* bottom panel */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        {phase === 'offered' && request ? (
          <Offer request={request} onAccept={onAccept} onDecline={decline} />
        ) : (
          <>
            <View style={styles.grabber} />
            <View style={styles.earnRow}>
              <View>
                <Eyebrow color={colors.jade}>Today</Eyebrow>
                <Text style={styles.earnBig}>{formatMoney(earningsToday)}</Text>
                <Text variant="small" color={colors.onInkMuted}>
                  You keep 100% — {tripsToday} {tripsToday === 1 ? 'trip' : 'trips'}
                </Text>
              </View>
              <Pressable
                style={styles.earnLink}
                testID="open-earnings"
                onPress={() => router.push('/(driver)/earnings')}
              >
                <Ionicons name="bar-chart" size={18} color={colors.jade} />
                <Text variant="smallStrong" color={colors.jade}>
                  Earnings
                </Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniStats}>
              <MiniStat icon="time-outline" value={online ? 'Live' : 'Idle'} label="Status" />
              <MiniStat icon="star" value={(user?.rating ?? 4.9).toFixed(2)} label="Rating" />
              <MiniStat icon="flame-outline" value="1.0x" label="Demand" />
            </ScrollView>

            {online && phase === 'online' ? (
              <View style={styles.searching}>
                <View style={styles.radar} />
                <Text variant="bodyStrong" color={colors.onInk}>
                  Listening for ride requests…
                </Text>
              </View>
            ) : null}

            <Pressable
              testID="toggle-online"
              onPress={online ? goOffline : goOnline}
              style={[styles.goBtn, { backgroundColor: online ? colors.inkSoft : colors.jade }]}
            >
              <Ionicons
                name={online ? 'pause' : 'power'}
                size={20}
                color={online ? colors.onInk : colors.white}
              />
              <Text style={[styles.goText, { color: online ? colors.onInk : colors.white }]}>
                {online ? 'Go offline' : 'Go online'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function Offer({
  request,
  onAccept,
  onDecline,
}: {
  request: NonNullable<ReturnType<typeof useDriver.getState>['request']>;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View testID="ride-offer">
      <View style={styles.offerHead}>
        <Eyebrow color={colors.amber}>New request</Eyebrow>
        <Text style={styles.offerFare}>{formatMoney(request.fare)}</Text>
      </View>
      <View style={styles.offerRider}>
        <Avatar name={request.rider} color={colors.amber} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color={colors.onInk}>
            {request.rider}
          </Text>
          <Text variant="small" color={colors.onInkMuted}>
            ★ {request.riderRating.toFixed(1)} · {request.distanceMi} mi · {request.etaMin} min away
          </Text>
        </View>
      </View>
      <View style={styles.offerRoute}>
        <Ionicons name="navigate" size={16} color={colors.jade} />
        <Text variant="small" color={colors.onInkMuted} numberOfLines={1} style={{ flex: 1 }}>
          {request.pickup.name} → {request.destination.name}
        </Text>
      </View>
      <View style={styles.offerActions}>
        <Pressable style={styles.declineBtn} testID="decline-ride" onPress={onDecline}>
          <Text variant="bodyStrong" color={colors.onInkMuted}>
            Decline
          </Text>
        </Pressable>
        <Pressable style={styles.acceptBtn} testID="accept-ride" onPress={onAccept}>
          <Text style={styles.goText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={16} color={colors.jade} />
      <Text variant="bodyStrong" color={colors.onInk}>
        {value}
      </Text>
      <Text variant="label" color={colors.onInkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  mapTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,23,38,0.12)' },
  topbar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  brandPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  statusBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: space.lg,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.inkLine,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
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
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.inkLine,
    marginBottom: space.lg,
  },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  earnBig: { fontFamily: fonts.monoBold, fontSize: 34, color: colors.onInk, marginVertical: 2 },
  earnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.inkSoft,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
  },
  miniStats: { gap: space.sm, paddingVertical: space.lg },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 40,
  },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.md,
  },
  radar: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.jade },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: radius.lg,
  },
  goText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },

  offerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  offerFare: { fontFamily: fonts.monoBold, fontSize: 28, color: colors.jade },
  offerRider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  offerRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  offerActions: { flexDirection: 'row', gap: space.md },
  declineBtn: {
    flex: 1,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    flex: 2,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
