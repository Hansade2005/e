import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Stars } from '@/components/ui/Stars';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useRide } from '@/store/ride';
import { useWallet } from '@/store/wallet';
import { useFavorites } from '@/store/favorites';
import { formatMoney } from '@/constants/vehicles';
import { kmToMiles } from '@/lib/geo';
import { colors, radius, space, fonts } from '@/theme/tokens';

const TIPS = [0, 2, 3, 5];

export default function Complete() {
  const insets = useSafeAreaInsets();
  const lastReceipt = useRide((s) => s.lastReceipt);
  const driver = useRide((s) => s.driver);
  const distanceKm = useRide((s) => s.distanceKm);
  const durationMin = useRide((s) => s.durationMin);
  const destination = useRide((s) => s.destination);
  const rateLastRide = useRide((s) => s.rateLastRide);
  const reset = useRide((s) => s.reset);
  const walletBalance = useWallet((s) => s.balance);
  const spendWallet = useWallet((s) => s.spend);
  const toggleFavorite = useFavorites((s) => s.toggle);
  const loadFavorites = useFavorites((s) => s.load);
  const favorites = useFavorites((s) => s.favorites);
  const isFavorite = !!driver && favorites.some((f) => f.ref === driver.id);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const [stars, setStars] = useState(5);
  const [tip, setTip] = useState(3);

  const fare = lastReceipt?.fare ?? 0;
  const rival = fare * 1.4; // Uber/Lyft take ~40% — Empower-style comparison
  const grossTotal = fare + tip;
  // Ez Wallet credit covers the fare (not the tip — tips go 100% to the driver).
  const walletApplied = Math.min(walletBalance, fare);
  const total = Math.max(0, grossTotal - walletApplied);

  async function done() {
    if (walletApplied > 0) await spendWallet(walletApplied, `Ride to ${destination?.name ?? 'destination'}`);
    await rateLastRide(stars, tip);
    // Pop the search → select-ride → complete chain back to the base home.
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/(rider)/home');
    reset();
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.lg }]}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.checkWrap}>
          <View style={styles.check}>
            <Ionicons name="checkmark" size={34} color={colors.white} />
          </View>
        </View>
        <Text variant="h1" center style={{ marginTop: space.lg }}>
          You&apos;ve arrived
        </Text>
        <Text variant="body" color={colors.textSecondary} center style={{ marginTop: 4 }}>
          {destination?.name}
        </Text>

        {/* Fare comparison — drivers keep 100% */}
        <View style={styles.fareCard}>
          <View style={styles.fareCol}>
            <Eyebrow color={colors.jade}>Ez2go</Eyebrow>
            <Text style={styles.fareBig}>{formatMoney(total)}</Text>
            <Text variant="small" color={colors.textSecondary}>
              Driver keeps 100%
            </Text>
          </View>
          <View style={styles.fareDivide} />
          <View style={styles.fareCol}>
            <Eyebrow color={colors.textMuted}>Uber / Lyft</Eyebrow>
            <Text style={[styles.fareBig, { color: colors.textMuted }]}>{formatMoney(rival)}</Text>
            <Text variant="small" color={colors.textSecondary}>
              They take ~40%
            </Text>
          </View>
        </View>

        {/* Receipt breakdown */}
        <View style={styles.receipt}>
          <Row label={`${lastReceipt?.vehicleName ?? 'Ride'} fare`} value={formatMoney(fare)} />
          <Row label="Tip" value={formatMoney(tip)} />
          {walletApplied > 0 ? (
            <Row label="Ez Wallet credit" value={`-${formatMoney(walletApplied)}`} credit />
          ) : null}
          <View style={styles.receiptDivider} />
          <Row label="Total paid" value={formatMoney(total)} bold />
          <Text variant="small" color={colors.textMuted} style={{ marginTop: space.sm }}>
            {kmToMiles(distanceKm).toFixed(1)} mi · {Math.round(durationMin)} min ·{' '}
            {walletApplied > 0 ? 'Ez Wallet + Visa •••• 4242' : 'Visa •••• 4242'}
          </Text>
        </View>

        {/* Tip selector */}
        <Text variant="label" color={colors.textSecondary} style={{ marginTop: space.xl }}>
          Add a tip — 100% goes to your driver
        </Text>
        <View style={styles.tips}>
          {TIPS.map((t) => (
            <Pressable
              key={t}
              testID={`tip-${t}`}
              onPress={() => setTip(t)}
              style={[styles.tip, tip === t && styles.tipActive]}
            >
              <Text variant="bodyStrong" color={tip === t ? colors.white : colors.ink}>
                {t === 0 ? 'None' : formatMoney(t)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Rate driver */}
        {driver ? (
          <View style={styles.rateCard}>
            <Avatar name={driver.name} color={driver.avatarColor} size={48} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Rate {driver.name}</Text>
              <Text variant="small" color={colors.textSecondary}>
                {driver.car}
              </Text>
            </View>
            <Stars value={stars} size={24} onChange={setStars} />
          </View>
        ) : null}

        {driver ? (
          <Pressable
            testID="favorite-driver"
            style={styles.favBtn}
            onPress={() =>
              toggleFavorite({
                ref: driver.id,
                name: driver.name,
                vehicle: driver.car,
                avatarColor: driver.avatarColor,
              })
            }
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? colors.amber : colors.textSecondary}
            />
            <Text variant="smallStrong" color={isFavorite ? colors.ink : colors.textSecondary}>
              {isFavorite ? `${driver.name.split(' ')[0]} is a favorite` : 'Add to favorite drivers'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label="Done" variant="primary" testID="complete-done" onPress={done} />
      </View>
    </View>
  );
}

function Row({ label, value, bold, credit }: { label: string; value: string; bold?: boolean; credit?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={bold ? 'bodyStrong' : 'body'} color={bold ? colors.ink : credit ? colors.jadeDark : colors.textSecondary}>
        {label}
      </Text>
      <Text style={[styles.rowValue, bold && { color: colors.ink, fontSize: 18 }, credit && { color: colors.jadeDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  checkWrap: { alignItems: 'center', marginTop: space.md },
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    marginTop: space.xl,
  },
  fareCol: { flex: 1, alignItems: 'center', gap: 4 },
  fareDivide: { width: 1, backgroundColor: colors.surfaceAlt, marginHorizontal: space.md },
  fareBig: { fontFamily: fonts.monoBold, fontSize: 30, color: colors.ink },
  receipt: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowValue: { fontFamily: fonts.mono, fontSize: 15, color: colors.textSecondary },
  receiptDivider: { height: 1, backgroundColor: colors.surfaceAlt, marginVertical: space.sm },
  tips: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  tip: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    marginTop: space.md,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.xl,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
    backgroundColor: colors.canvas,
  },
});
