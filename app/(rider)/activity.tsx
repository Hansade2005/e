import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useNotifications } from '@/store/notifications';
import { useRide } from '@/store/ride';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space } from '@/theme/tokens';

const TONE: Record<string, string> = {
  jade: colors.jade,
  amber: colors.amber,
  ink: colors.ink,
};

export default function Activity() {
  const insets = useSafeAreaInsets();
  const items = useNotifications((s) => s.items);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const scheduled = useRide((s) => s.scheduled);
  const cancelScheduled = useRide((s) => s.cancelScheduled);

  useEffect(() => {
    // Mark read shortly after viewing so the badge clears.
    const t = setTimeout(() => markAllRead(), 600);
    return () => clearTimeout(t);
  }, [markAllRead]);

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="activity-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Activity</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        {scheduled.length ? (
          <>
            <Eyebrow>Upcoming</Eyebrow>
            {scheduled.map((s) => (
              <View key={s.id} style={styles.scheduledCard} testID={`scheduled-${s.id}`}>
                <View style={styles.schedIcon}>
                  <Ionicons name="calendar" size={20} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">
                    {new Date(s.when).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <Text variant="small" color={colors.textSecondary} numberOfLines={1}>
                    {s.vehicleName} → {s.destination.name} · {formatMoney(s.fare)}
                  </Text>
                </View>
                <Pressable onPress={() => cancelScheduled(s.id)} hitSlop={8} testID={`cancel-sched-${s.id}`}>
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <View style={{ height: space.lg }} />
          </>
        ) : null}

        <Eyebrow>Recent</Eyebrow>
        {items.length === 0 ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: space.md }}>
            You&apos;re all caught up.
          </Text>
        ) : (
          items.map((n) => (
            <View key={n.id} style={styles.item} testID={`notif-${n.id}`}>
              <View style={[styles.itemIcon, { backgroundColor: (TONE[n.tone] ?? colors.ink) + '1A' }]}>
                <Ionicons name={n.icon} size={20} color={TONE[n.tone] ?? colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.itemTop}>
                  <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{n.title}</Text>
                  {!n.read ? <View style={styles.unread} /> : null}
                </View>
                <Text variant="small" color={colors.textSecondary}>{n.body}</Text>
                <Text variant="label" color={colors.textMuted} style={{ marginTop: 4 }}>
                  {timeAgo(n.at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function timeAgo(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
  },
  scheduledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.jadeSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  schedIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  itemIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
});
