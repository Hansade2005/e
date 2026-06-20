import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Toggle } from '@/components/ui/Toggle';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { units, notifyRides, notifyPromos, quietByDefault, load, setUnits, toggle } =
    useSettings();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="settings-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        <Eyebrow>Distance units</Eyebrow>
        <View style={styles.segment}>
          {(['mi', 'km'] as const).map((u) => {
            const active = units === u;
            return (
              <Pressable
                key={u}
                testID={`units-${u}`}
                onPress={() => setUnits(u)}
                style={[styles.seg, active && styles.segActive]}
              >
                <Text variant="bodyStrong" color={active ? colors.white : colors.textSecondary}>
                  {u === 'mi' ? 'Miles' : 'Kilometers'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: space.xl }} />
        <Eyebrow>Notifications</Eyebrow>
        <View style={styles.card}>
          <Row
            icon="car"
            title="Ride updates"
            sub="Driver matched, arriving, and trip status"
            value={notifyRides}
            onChange={() => toggle('notifyRides')}
            testID="toggle-rides"
          />
          <Divider />
          <Row
            icon="pricetag"
            title="Promotions & offers"
            sub="Promo codes and savings"
            value={notifyPromos}
            onChange={() => toggle('notifyPromos')}
            testID="toggle-promos"
          />
        </View>

        <View style={{ height: space.xl }} />
        <Eyebrow>Ride defaults</Eyebrow>
        <View style={styles.card}>
          <Row
            icon="volume-mute"
            title="Quiet rides by default"
            sub="Start each booking with the quiet-ride preference"
            value={quietByDefault}
            onChange={() => toggle('quietByDefault')}
            testID="toggle-quiet"
          />
        </View>

        <Text variant="small" color={colors.textMuted} center style={{ marginTop: space.xxl }}>
          Ez2go v1.0 · Powered by OpenStreetMap
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  title,
  sub,
  value,
  onChange,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color={colors.textSecondary}>{sub}</Text>
      </View>
      <Toggle value={value} onChange={onChange} testID={testID} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  seg: { flex: 1, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segActive: { backgroundColor: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.canvas },
});
