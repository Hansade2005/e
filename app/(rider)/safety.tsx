import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useRide } from '@/store/ride';
import { colors, radius, space } from '@/theme/tokens';

export default function Safety() {
  const insets = useSafeAreaInsets();
  const driver = useRide((s) => s.driver);
  const destination = useRide((s) => s.destination);
  const [shared, setShared] = useState(false);

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="safety-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Safety toolkit</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        {/* trip snapshot */}
        <View style={styles.snapshot}>
          <View style={styles.shieldIcon}>
            <Ionicons name="shield-checkmark" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={colors.onInk}>You&apos;re protected</Text>
            <Text variant="small" color={colors.onInkMuted}>
              {driver ? `Trip with ${driver.name} · ${driver.plate}` : 'Tools are ready before you ride'}
            </Text>
          </View>
        </View>

        <Eyebrow>Act now</Eyebrow>
        <Pressable
          style={[styles.action, { backgroundColor: colors.danger }]}
          testID="safety-emergency"
          onPress={() => Linking.openURL('tel:911').catch(() => {})}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="alert" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={colors.white}>Call 911</Text>
            <Text variant="small" color="rgba(255,255,255,0.85)">Shares your live location with the operator</Text>
          </View>
          <Ionicons name="call" size={20} color={colors.white} />
        </Pressable>

        <Pressable
          style={styles.tool}
          testID="safety-share"
          onPress={() => setShared(true)}
        >
          <View style={[styles.toolIcon, shared && { backgroundColor: colors.jade }]}>
            <Ionicons name={shared ? 'checkmark' : 'navigate'} size={20} color={shared ? colors.white : colors.jade} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{shared ? 'Trip shared' : 'Share my trip'}</Text>
            <Text variant="small" color={colors.textSecondary}>
              {shared
                ? `A live link to ${destination?.name ?? 'your route'} was sent`
                : 'Send a live tracking link to a trusted contact'}
            </Text>
          </View>
          {!shared ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </Pressable>

        <View style={{ height: space.lg }} />
        <Eyebrow>Set up ahead of time</Eyebrow>
        <Tool icon="people" title="Trusted contacts" sub="Auto-share every late-night ride" />
        <Tool icon="flag" title="Report a concern" sub="Tell our safety team about this trip" />
        <Tool icon="recording" title="Audio recording" sub="Record encrypted audio during rides" />

        <Text variant="small" color={colors.textMuted} center style={{ marginTop: space.xl }}>
          Ez2go verifies every driver and monitors trips for unusual stops.
        </Text>
      </ScrollView>
    </View>
  );
}

function Tool({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <Pressable style={styles.tool}>
      <View style={styles.toolIcon}>
        <Ionicons name={icon} size={20} color={colors.jade} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color={colors.textSecondary}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
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
  snapshot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.jadeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
