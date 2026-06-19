import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MapView } from '@/components/Map';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/ui/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/store/auth';
import { useRide } from '@/store/ride';
import { usePlaces } from '@/store/places';
import { useNotifications, unreadCount } from '@/store/notifications';
import { nearbyDrivers, type Place } from '@/lib/geo';
import { localPlaces } from '@/lib/geo';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';

export default function Home() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const pickup = useRide((s) => s.pickup);
  const reset = useRide((s) => s.reset);
  const setDestination = useRide((s) => s.setDestination);
  const loadHistory = useRide((s) => s.loadHistory);
  const scheduledAt = useRide((s) => s.scheduledAt);
  const loadPlaces = usePlaces((s) => s.load);
  const savedPlaces = usePlaces((s) => s.places);
  const savedHome = savedPlaces.find((p) => p.kind === 'home');
  const savedWork = savedPlaces.find((p) => p.kind === 'work');
  const favorites = useMemo(() => savedPlaces.filter((p) => p.kind === 'favorite'), [savedPlaces]);
  const loadNotifs = useNotifications((s) => s.load);
  const notifs = useNotifications((s) => s.items);
  const unread = unreadCount(notifs);

  useEffect(() => {
    loadHistory();
    loadPlaces();
    loadNotifs();
  }, [loadHistory, loadPlaces, loadNotifs]);

  const scheduleLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })
    : 'Now';

  // Ensure a clean slate whenever we land on home.
  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  const drivers = useMemo(
    () => (pickup ? nearbyDrivers(pickup, 7) : []),
    [pickup?.lat, pickup?.lng],
  );

  const quick = localPlaces.slice(0, 4);

  async function goToPlace(place: Place) {
    await setDestination(place);
    router.push('/(rider)/select-ride');
  }

  // A saved slot rides to it when set; otherwise opens the editor to add it.
  function slotPress(place?: Place) {
    if (place) goToPlace(place);
    else router.push('/(rider)/saved-places');
  }

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <MapView center={pickup ?? undefined} pickup={pickup} drivers={drivers} />
      </View>

      {/* Top bar */}
      <View style={[styles.topbar, { top: insets.top + space.sm }]}>
        <IconButton name="menu" testID="open-menu" onPress={() => router.push('/(rider)/profile')} />
        <View style={styles.brandPill}>
          <Logo size={20} />
        </View>
        <View style={styles.topRight}>
          <Pressable testID="open-activity" onPress={() => router.push('/(rider)/activity')}>
            <IconButton name="notifications-outline" onPress={() => router.push('/(rider)/activity')} />
            {unread > 0 ? (
              <View style={styles.badge} testID="activity-badge">
                <Text variant="label" color={colors.white} style={{ fontSize: 9 }}>
                  {unread > 9 ? '9+' : unread}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => router.push('/(rider)/profile')} testID="open-profile">
            <Avatar name={user?.name ?? 'Rider'} color={user?.avatarColor} size={46} />
          </Pressable>
        </View>
      </View>

      {/* Side controls: AI assistant + recenter */}
      <View style={[styles.sideControls, { bottom: 320 + insets.bottom }]}>
        <Pressable
          style={styles.aiBtn}
          testID="open-assistant"
          onPress={() => router.push('/(rider)/assistant')}
        >
          <Ionicons name="sparkles" size={16} color={colors.white} />
          <Text variant="smallStrong" color={colors.white}>Ask Ez</Text>
        </Pressable>
        <IconButton name="locate" color={colors.jade} />
      </View>

      {/* Bottom panel */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />
        <Eyebrow>Where to?</Eyebrow>

        <View style={styles.searchBar}>
          <Pressable
            testID="search-bar"
            style={styles.searchTap}
            onPress={() => router.push('/(rider)/search')}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <Text variant="bodyStrong" color={colors.textSecondary} numberOfLines={1}>
              Enter a destination
            </Text>
          </Pressable>
          <Pressable
            testID="schedule-pill"
            style={[styles.nowPill, scheduledAt != null && styles.nowPillActive]}
            onPress={() => router.push('/(rider)/schedule')}
          >
            <Ionicons name="time-outline" size={14} color={scheduledAt ? colors.white : colors.ink} />
            <Text variant="label" color={scheduledAt ? colors.white : colors.ink}>
              {scheduleLabel}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <SavedChip icon="home" label="Home" testID="chip-home" onPress={() => slotPress(savedHome)} />
          <SavedChip icon="briefcase" label="Work" testID="chip-work" onPress={() => slotPress(savedWork)} />
          {favorites.map((p) => (
            <SavedChip
              key={p.id}
              icon="star"
              label={p.name.split(' ').slice(0, 2).join(' ')}
              onPress={() => goToPlace(p)}
            />
          ))}
          {quick.map((p) => (
            <SavedChip
              key={p.id}
              icon="location"
              label={p.name.split(' ').slice(0, 2).join(' ')}
              onPress={() => goToPlace(p)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function SavedChip({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable style={styles.chip} onPress={onPress} testID={testID}>
      <View style={styles.chipIcon}>
        <Ionicons name={icon} size={16} color={colors.jade} />
      </View>
      <Text variant="smallStrong" numberOfLines={1} style={{ maxWidth: 110 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  topbar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  brandPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  sideControls: { position: 'absolute', right: space.lg, gap: space.sm, alignItems: 'flex-end' },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    paddingHorizontal: space.md,
    height: 44,
    borderRadius: radius.pill,
    ...shadow.float,
  },
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    height: 60,
    marginTop: space.xs,
  },
  searchTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: '100%' },
  nowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.pill,
  },
  nowPillActive: { backgroundColor: colors.jade },
  chips: { gap: space.sm, paddingVertical: space.lg, paddingRight: space.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingLeft: 8,
    paddingRight: 16,
    height: 44,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.jadeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fonts: { fontFamily: fonts.body },
});
