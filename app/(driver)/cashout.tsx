import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useDriver } from '@/store/driver';
import { useInvest, SHARE_PRICE, ownershipPct } from '@/store/invest';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space, fonts } from '@/theme/tokens';

const PRESETS = [
  { id: 'none', label: 'None', pct: 0 },
  { id: '25', label: '25%', pct: 0.25 },
  { id: '50', label: '50%', pct: 0.5 },
  { id: 'all', label: 'All', pct: 1 },
];

export default function CashOut() {
  const insets = useSafeAreaInsets();
  const available = useDriver((s) => s.earningsToday);
  const cashOut = useDriver((s) => s.cashOut);
  const invest = useInvest((s) => s.invest);
  const investedTotal = useInvest((s) => s.invested);
  const sharesTotal = useInvest((s) => s.shares);
  const loadInvest = useInvest((s) => s.load);

  const [presetId, setPresetId] = useState('none');
  const [done, setDone] = useState<{ cashed: number; invested: number; shares: number } | null>(null);

  useEffect(() => {
    loadInvest();
  }, [loadInvest]);

  const preset = PRESETS.find((p) => p.id === presetId)!;
  const investAmount = Math.round(available * preset.pct * 100) / 100;
  const cashAmount = Math.round((available - investAmount) * 100) / 100;
  const newShares = investAmount / SHARE_PRICE;

  async function confirm() {
    let added = 0;
    if (investAmount > 0) added = await invest(investAmount);
    const cashed = await cashOut();
    setDone({ cashed: cashed - investAmount, invested: investAmount, shares: added });
  }

  if (done) {
    const totalShares = sharesTotal;
    return (
      <View style={[styles.fill, { paddingTop: insets.top + space.lg }]}>
        <ScrollView contentContainerStyle={{ padding: space.xl }}>
          <View style={styles.successCheck}>
            <Ionicons name="checkmark" size={32} color={colors.white} />
          </View>
          <Text variant="h2" color={colors.onInk} center style={{ marginTop: space.lg }}>
            All set
          </Text>
          <Text variant="body" color={colors.onInkMuted} center style={{ marginTop: 4 }}>
            {formatMoney(done.cashed)} to your debit
            {done.invested > 0 ? ` · ${formatMoney(done.invested)} invested` : ''}
          </Text>

          {done.invested > 0 ? (
            <View style={styles.stakeBig}>
              <Eyebrow color={colors.jade} onDark>Your Ez2go stake</Eyebrow>
              <Text style={styles.stakeShares}>{totalShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares</Text>
              <Text variant="small" color={colors.onInkMuted}>
                {formatMoney(investedTotal)} invested · {ownershipPct(totalShares).toFixed(4)}% ownership
              </Text>
            </View>
          ) : null}

          <Button
            label="Back to driving"
            variant="go"
            testID="cashout-done"
            onPress={() => router.back()}
            style={{ marginTop: space.xl }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="cashout-back">
          <Ionicons name="chevron-back" size={26} color={colors.onInk} />
        </Pressable>
        <Text variant="h3" color={colors.onInk}>Cash out</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + 120 }}>
        <View style={styles.availCard}>
          <Eyebrow color={colors.jade} onDark>Available now</Eyebrow>
          <Text style={styles.availBig} testID="cashout-available">{formatMoney(available)}</Text>
          <Text variant="small" color={colors.onInkMuted}>You keep 100% — no fees, instant transfer.</Text>
        </View>

        {/* Invest in the business */}
        <View style={styles.investHead}>
          <Ionicons name="trending-up" size={18} color={colors.jade} />
          <Text variant="bodyStrong" color={colors.onInk}>Invest in Ez2go</Text>
        </View>
        <Text variant="small" color={colors.onInkMuted} style={{ marginBottom: space.md }}>
          Own a piece of the platform you drive for. Shares are {formatMoney(SHARE_PRICE)} each — put part
          of this cashout toward equity instead of your bank.
        </Text>

        <View style={styles.presets}>
          {PRESETS.map((p) => {
            const active = p.id === presetId;
            return (
              <Pressable
                key={p.id}
                testID={`invest-${p.id}`}
                onPress={() => setPresetId(p.id)}
                style={[styles.preset, active && styles.presetActive]}
              >
                <Text variant="bodyStrong" color={active ? colors.ink : colors.onInk}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* split */}
        <View style={styles.split}>
          <Row label="To your debit" value={formatMoney(cashAmount)} />
          <Row label="Invested" value={formatMoney(investAmount)} accent />
          {investAmount > 0 ? (
            <Row label="Shares bought" value={newShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} accent />
          ) : null}
        </View>

        {/* current holdings */}
        {investedTotal > 0 ? (
          <View style={styles.holdings}>
            <Text variant="label" color={colors.onInkMuted}>Current stake</Text>
            <Text variant="bodyStrong" color={colors.onInk}>
              {sharesTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares · {formatMoney(investedTotal)}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label={available <= 0 ? 'Nothing to cash out' : `Cash out ${formatMoney(available)}`}
          variant="go"
          testID="cashout-confirm"
          disabled={available <= 0}
          onPress={confirm}
        />
      </View>
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="body" color={colors.onInkMuted}>{label}</Text>
      <Text style={[styles.rowVal, accent && { color: colors.jade }]}>{value}</Text>
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
  availCard: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.inkLine,
    padding: space.xl,
  },
  availBig: { fontFamily: fonts.monoBold, fontSize: 40, color: colors.onInk, marginVertical: space.sm },
  investHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.xl, marginBottom: space.xs },
  presets: { flexDirection: 'row', gap: space.sm },
  preset: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActive: { backgroundColor: colors.jade, borderColor: colors.jade },
  split: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowVal: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.onInk },
  holdings: { marginTop: space.lg, gap: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
  },
  successCheck: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeBig: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    padding: space.xl,
    marginTop: space.xl,
    gap: 4,
  },
  stakeShares: { fontFamily: fonts.monoBold, fontSize: 28, color: colors.onInk, marginVertical: 2 },
});
