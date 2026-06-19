import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useEffect } from 'react';
import { useDriver } from '@/store/driver';
import { useInvest, ownershipPct } from '@/store/invest';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space, fonts } from '@/theme/tokens';

const WEEK = [
  { d: 'Mon', v: 0.55 },
  { d: 'Tue', v: 0.8 },
  { d: 'Wed', v: 0.42 },
  { d: 'Thu', v: 0.95 },
  { d: 'Fri', v: 0.7 },
  { d: 'Sat', v: 1 },
  { d: 'Sun', v: 0.35 },
];

export default function Earnings() {
  const insets = useSafeAreaInsets();
  const { earningsToday, tripsToday, history } = useDriver();
  const investedTotal = useInvest((s) => s.invested);
  const sharesTotal = useInvest((s) => s.shares);
  const loadInvest = useInvest((s) => s.load);

  useEffect(() => {
    loadInvest();
  }, [loadInvest]);

  const weekTotal = 642.18 + earningsToday;
  const avgPerTrip = tripsToday ? earningsToday / tripsToday : 0;

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="earnings-back">
          <Ionicons name="chevron-back" size={26} color={colors.onInk} />
        </Pressable>
        <Text variant="h3" color={colors.onInk}>
          Earnings
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        <View style={styles.hero}>
          <Eyebrow color={colors.jade} onDark>
            This week · you keep 100%
          </Eyebrow>
          <Text style={styles.heroValue}>{formatMoney(weekTotal)}</Text>
          <View style={styles.heroMeta}>
            <Text variant="small" color={colors.jade}>
              ↑ 12% vs last week
            </Text>
            <Text variant="small" color={colors.onInkMuted}>
              $0.00 in platform fees
            </Text>
          </View>
        </View>

        {/* bar chart */}
        <View style={styles.chartCard}>
          <Eyebrow color={colors.onInkMuted} onDark>
            Daily
          </Eyebrow>
          <View style={styles.chart}>
            {WEEK.map((b) => (
              <View key={b.d} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${b.v * 100}%` }]} />
                </View>
                <Text variant="label" color={colors.onInkMuted}>
                  {b.d}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatBox label="Today" value={formatMoney(earningsToday)} />
          <StatBox label="Trips today" value={String(tripsToday)} />
          <StatBox label="Avg / trip" value={formatMoney(avgPerTrip)} />
          <StatBox label="Acceptance" value="98%" />
        </View>

        <Pressable
          style={styles.cashout}
          testID="open-cashout"
          onPress={() => router.push('/(driver)/cashout')}
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={colors.onInk}>
              Cash out or invest
            </Text>
            <Text variant="small" color={colors.onInkMuted}>
              {formatMoney(earningsToday)} available now · no fee
            </Text>
          </View>
          <View style={styles.cashBtn}>
            <Text variant="smallStrong" color={colors.ink}>
              Cash out
            </Text>
          </View>
        </Pressable>

        {/* Ownership stake */}
        {investedTotal > 0 ? (
          <View style={styles.stake} testID="stake-card">
            <View style={styles.stakeIcon}>
              <Ionicons name="trending-up" size={20} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={colors.onInk}>Your Ez2go stake</Text>
              <Text variant="small" color={colors.onInkMuted}>
                {sharesTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares · {ownershipPct(sharesTotal).toFixed(4)}%
              </Text>
            </View>
            <Text style={styles.stakeVal}>{formatMoney(investedTotal)}</Text>
          </View>
        ) : null}

        {history.length ? (
          <>
            <Eyebrow color={colors.onInkMuted} onDark>
              Recent payouts
            </Eyebrow>
            {history.slice(0, 8).map((f, i) => (
              <View key={i} style={styles.payoutRow}>
                <Ionicons name="cash-outline" size={18} color={colors.jade} />
                <Text variant="body" color={colors.onInk} style={{ flex: 1 }}>
                  Completed trip
                </Text>
                <Text style={styles.payoutVal}>{formatMoney(f)}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text variant="label" color={colors.onInkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
  },
  hero: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.inkLine,
    padding: space.xl,
  },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 42, color: colors.onInk, marginVertical: space.sm },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  chartCard: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, marginTop: space.md, gap: space.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '70%', flex: 1, justifyContent: 'flex-end', backgroundColor: colors.inkLine, borderRadius: 6, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.jade, borderRadius: 6 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  statBox: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 4,
  },
  statVal: { fontFamily: fonts.monoBold, fontSize: 22, color: colors.onInk },
  cashout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: '#0F2A2A',
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
    marginBottom: space.xl,
  },
  cashBtn: {
    backgroundColor: colors.jade,
    paddingHorizontal: space.lg,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.inkLine,
    padding: space.lg,
    marginBottom: space.xl,
  },
  stakeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.jade, alignItems: 'center', justifyContent: 'center' },
  stakeVal: { fontFamily: fonts.monoBold, fontSize: 17, color: colors.jade },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkLine,
  },
  payoutVal: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.jade },
});
