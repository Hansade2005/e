import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useInvest, SHARE_PRICE, ownershipPct } from '@/store/invest';
import { useWallet } from '@/store/wallet';
import { payments } from '@/lib/payments';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space, fonts } from '@/theme/tokens';

const AMOUNTS = [25, 50, 100, 250];

export default function RiderInvest() {
  const insets = useSafeAreaInsets();
  const invest = useInvest((s) => s.invest);
  const investedTotal = useInvest((s) => s.invested);
  const sharesTotal = useInvest((s) => s.shares);
  const loadInvest = useInvest((s) => s.load);
  const walletBalance = useWallet((s) => s.balance);
  const spendWallet = useWallet((s) => s.spend);
  const loadWallet = useWallet((s) => s.load);

  const [amount, setAmount] = useState(50);
  const [useWalletSrc, setUseWalletSrc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ amount: number; shares: number } | null>(null);

  useEffect(() => {
    loadInvest();
    loadWallet();
  }, [loadInvest, loadWallet]);

  const walletCovers = walletBalance >= amount;
  const shares = amount / SHARE_PRICE;

  async function confirm() {
    setBusy(true);
    try {
      if (useWalletSrc && walletCovers) {
        await spendWallet(amount, 'Ez2go shares');
      } else {
        await payments.charge({ amount, currency: 'USD', methodId: 'pm_visa', description: 'Ez2go shares' });
      }
      const added = await invest(amount);
      setDone({ amount, shares: added });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + space.lg }]}>
        <ScrollView contentContainerStyle={{ padding: space.xl }}>
          <View style={styles.check}>
            <Ionicons name="trending-up" size={32} color={colors.white} />
          </View>
          <Text variant="h1" center style={{ marginTop: space.lg }}>You&apos;re an owner</Text>
          <Text variant="body" color={colors.textSecondary} center style={{ marginTop: 4 }}>
            You bought {done.shares.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares
            for {formatMoney(done.amount)}.
          </Text>
          <View style={styles.stakeBig}>
            <Eyebrow>Your Ez2go stake</Eyebrow>
            <Text style={styles.stakeShares}>
              {sharesTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares
            </Text>
            <Text variant="small" color={colors.textSecondary}>
              {formatMoney(investedTotal)} invested · {ownershipPct(sharesTotal).toFixed(4)}% ownership
            </Text>
          </View>
          <Button label="Done" variant="primary" testID="invest-done" onPress={() => router.back()} style={{ marginTop: space.xl }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="invest-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Own Ez2go</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + 120 }}>
        {/* Pitch */}
        <View style={styles.hero}>
          <Eyebrow color={colors.jade} onDark>Community owned</Eyebrow>
          <Text variant="h2" color={colors.onInk} style={{ marginTop: 4 }}>
            Ride-share owned by{'\n'}the people who use it.
          </Text>
          <Text variant="small" color={colors.onInkMuted} style={{ marginTop: space.md }}>
            Riders and drivers build Ez2go together. Buy shares at {formatMoney(SHARE_PRICE)} and earn a
            real stake in the platform — not just a ride.
          </Text>
        </View>

        {investedTotal > 0 ? (
          <View style={styles.stakeRow} testID="invest-stake">
            <Ionicons name="ribbon" size={18} color={colors.jade} />
            <Text variant="smallStrong" color={colors.jadeDark} style={{ flex: 1 }}>
              You own {sharesTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares ({formatMoney(investedTotal)})
            </Text>
          </View>
        ) : null}

        <Text variant="label" color={colors.textSecondary} style={{ marginTop: space.lg, marginBottom: space.sm }}>
          Choose an amount
        </Text>
        <View style={styles.amounts}>
          {AMOUNTS.map((a) => {
            const active = a === amount;
            return (
              <Pressable
                key={a}
                testID={`invest-amount-${a}`}
                onPress={() => setAmount(a)}
                style={[styles.amount, active && styles.amountActive]}
              >
                <Text variant="bodyStrong" color={active ? colors.white : colors.ink}>{formatMoney(a)}</Text>
                <Text variant="label" color={active ? 'rgba(255,255,255,0.8)' : colors.textMuted}>
                  {(a / SHARE_PRICE).toFixed(0)} shares
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* payment source */}
        <Pressable
          style={styles.source}
          testID="invest-source"
          onPress={() => walletCovers && setUseWalletSrc((v) => !v)}
        >
          <Ionicons name={useWalletSrc && walletCovers ? 'wallet' : 'card'} size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">
              {useWalletSrc && walletCovers ? 'Ez Wallet' : 'Visa •••• 4242'}
            </Text>
            <Text variant="small" color={colors.textSecondary}>
              {walletCovers ? `Tap to pay from ${useWalletSrc ? 'card' : `wallet (${formatMoney(walletBalance)})`}` : 'Card on file'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.summary}>
          <Text variant="body" color={colors.textSecondary}>{shares.toFixed(0)} shares · {ownershipPct(shares).toFixed(4)}%</Text>
          <Text style={styles.summaryVal}>{formatMoney(amount)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label={`Invest ${formatMoney(amount)}`}
          variant="primary"
          testID="invest-confirm"
          loading={busy}
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
  hero: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: space.xl },
  stakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.jadeSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
  },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  amount: {
    width: '47%',
    flexGrow: 1,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  amountActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  summaryVal: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.ink },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  check: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeBig: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, marginTop: space.xl, gap: 4 },
  stakeShares: { fontFamily: fonts.monoBold, fontSize: 28, color: colors.ink, marginVertical: 2 },
});
