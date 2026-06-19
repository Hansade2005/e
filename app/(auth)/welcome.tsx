import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useAuth } from '@/store/auth';
import { colors, fonts, radius, space } from '@/theme/tokens';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const continueAsGuest = useAuth((s) => s.continueAsGuest);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
    >
      <View style={styles.header}>
        <Logo size={30} onDark />
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text variant="label" color={colors.jade}>
            Live
          </Text>
        </View>
      </View>

      {/* Hero: the route is the thesis */}
      <View style={styles.hero}>
        <Eyebrow color={colors.jade} onDark>
          A → B, the easy way
        </Eyebrow>
        <Text variant="hero" color={colors.onInk} style={styles.heroTitle}>
          Tap a pin.{'\n'}A ride is{' '}
          <Text variant="hero" color={colors.jade}>
            already
          </Text>{' '}
          moving.
        </Text>
        <Text variant="body" color={colors.onInkMuted} style={styles.heroSub}>
          Fair fares on OpenStreetMap. Drivers keep 100% of every dollar — no
          40% cut, ever.
        </Text>
      </View>

      <HeroRoute />

      <View style={styles.stats}>
        <Stat value="100%" label="To drivers" color={colors.jade} />
        <View style={styles.statDiv} />
        <Stat value="~20%" label="You save" color={colors.amber} />
        <View style={styles.statDiv} />
        <Stat value="3 min" label="Avg pickup" color={colors.onInk} />
      </View>

      <View style={{ height: space.xl }} />

      <View style={styles.actions}>
        <Button
          label="Get started"
          variant="primary"
          testID="cta-get-started"
          icon={<Ionicons name="arrow-forward" size={18} color={colors.ink} />}
          onPress={() => router.push('/(auth)/sign-up')}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onDark
          testID="cta-sign-in"
          onPress={() => router.push('/(auth)/sign-in')}
          style={{ height: 48 }}
        />
        <Button
          label="Explore as guest"
          variant="outline"
          onDark
          testID="cta-guest"
          onPress={async () => {
            await continueAsGuest('rider');
            router.replace('/(rider)/home');
          }}
        />
        <Text variant="small" color={colors.onInkMuted} center style={{ marginTop: space.sm }}>
          On dark? Style stays dark.
        </Text>
      </View>
      <View style={{ height: insets.bottom + space.lg }} />
    </ScrollView>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text variant="label" color={colors.onInkMuted}>
        {label}
      </Text>
    </View>
  );
}

/** The signature route line: jade origin → right-angle path → amber pin. */
function HeroRoute() {
  return (
    <View style={styles.routeCard}>
      <View style={styles.routeInner}>
        {/* origin node */}
        <View style={[styles.node, { backgroundColor: colors.jade, top: 14, left: 18 }]} />
        {/* horizontal seg */}
        <View style={[styles.segH, { top: 21, left: 30, width: 120 }]} />
        {/* corner down */}
        <View style={[styles.segV, { top: 21, left: 150, height: 70 }]} />
        {/* car midway */}
        <View style={[styles.car, { top: 78, left: 138 }]}>
          <Text style={{ fontSize: 16 }}>🚗</Text>
        </View>
        {/* horizontal seg 2 */}
        <View style={[styles.segH, { top: 90, left: 150, width: 90 }]} />
        {/* destination pin */}
        <View style={[styles.pin, { top: 80, right: 18 }]}>
          <Ionicons name="location" size={18} color={colors.onInk} />
        </View>
        <View style={styles.routeMeta}>
          <Text variant="label" color={colors.onInkMuted}>
            Power & Light → City Market
          </Text>
          <Text style={styles.routeFare}>$8.40 · 9 min</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.jade },

  hero: { marginTop: space.xxxl },
  heroTitle: { marginTop: space.sm },
  heroSub: { marginTop: space.lg, maxWidth: 360 },

  routeCard: {
    marginTop: space.xl,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.inkLine,
    height: 168,
    overflow: 'hidden',
  },
  routeInner: { flex: 1 },
  node: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.ink },
  segH: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: colors.onInkMuted },
  segV: { position: 'absolute', width: 3, borderRadius: 2, backgroundColor: colors.onInkMuted },
  car: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeMeta: { position: 'absolute', bottom: 14, left: 18, gap: 4 },
  routeFare: { fontFamily: fonts.monoBold, fontSize: 18, color: colors.onInk },

  stats: {
    marginTop: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    borderWidth: 1,
    borderColor: colors.inkLine,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: fonts.monoBold, fontSize: 22 },
  statDiv: { width: 1, height: 32, backgroundColor: colors.inkLine },

  actions: { gap: space.sm },
});
