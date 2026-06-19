import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useRide } from '@/store/ride';
import { colors, radius, space } from '@/theme/tokens';

type Option = { id: string; label: string; sub: string; at: number | null };

function buildOptions(): Option[] {
  const now = new Date();
  const evening = new Date(now);
  evening.setHours(18, 0, 0, 0);
  if (evening.getTime() < now.getTime() + 3600_000) evening.setDate(evening.getDate() + 1);
  const tomorrowAm = new Date(now);
  tomorrowAm.setDate(now.getDate() + 1);
  tomorrowAm.setHours(8, 0, 0, 0);
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

  return [
    { id: 'now', label: 'Now', sub: 'Match me with the nearest driver', at: null },
    { id: '30', label: 'In 30 minutes', sub: fmt(new Date(now.getTime() + 30 * 60000)), at: now.getTime() + 30 * 60000 },
    { id: '60', label: 'In 1 hour', sub: fmt(new Date(now.getTime() + 60 * 60000)), at: now.getTime() + 60 * 60000 },
    { id: 'eve', label: 'This evening', sub: fmt(evening), at: evening.getTime() },
    { id: 'am', label: 'Tomorrow morning', sub: fmt(tomorrowAm), at: tomorrowAm.getTime() },
  ];
}

export default function Schedule() {
  const insets = useSafeAreaInsets();
  const scheduledAt = useRide((s) => s.scheduledAt);
  const setScheduledAt = useRide((s) => s.setScheduledAt);

  const options = buildOptions();
  const initial = options.find((o) => o.at === scheduledAt)?.id ?? 'now';
  const [selected, setSelected] = useState(initial);

  function confirm() {
    const opt = options.find((o) => o.id === selected)!;
    setScheduledAt(opt.at);
    router.back();
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="schedule-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Pickup time</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl }}>
        <Eyebrow>When do you ride?</Eyebrow>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: space.lg }}>
          Lock in a driver ahead of time — fares are quoted at booking.
        </Text>

        {options.map((o) => {
          const active = o.id === selected;
          return (
            <Pressable
              key={o.id}
              testID={`time-${o.id}`}
              onPress={() => setSelected(o.id)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{o.label}</Text>
                <Text variant="small" color={colors.textSecondary}>{o.sub}</Text>
              </View>
              {o.at === null ? (
                <Ionicons name="flash" size={18} color={active ? colors.jade : colors.textMuted} />
              ) : (
                <Ionicons name="calendar-outline" size={18} color={active ? colors.jade : colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label={selected === 'now' ? 'Ride now' : 'Set pickup time'}
          variant="primary"
          testID="confirm-time"
          onPress={confirm}
        />
      </View>
    </View>
  );
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.surface,
    padding: space.lg,
    marginBottom: space.sm,
  },
  optionActive: { borderColor: colors.jade, backgroundColor: colors.jadeSoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.jade },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.jade },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
});
