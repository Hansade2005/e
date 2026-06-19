import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { payments, type PaymentMethod } from '@/lib/payments';
import { useRide } from '@/store/ride';
import { useWallet } from '@/store/wallet';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space, fonts } from '@/theme/tokens';

const BRAND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  visa: 'card',
  mastercard: 'card',
  amex: 'card',
  cash: 'cash',
  wallet: 'wallet',
};

export default function PaymentMethods() {
  const insets = useSafeAreaInsets();
  const setMethod = useRide((s) => s.setMethod);
  const wallet = useWallet();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [busy, setBusy] = useState(false);
  const [promo, setPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh() {
    setMethods(await payments.listMethods());
  }
  useEffect(() => {
    refresh();
    wallet.load();
  }, []);

  async function applyPromo() {
    const res = await wallet.applyPromo(promo);
    setPromoMsg({ ok: res.ok, text: res.message });
    if (res.ok) setPromo('');
  }

  async function makeDefault(id: string) {
    await payments.setDefault(id);
    setMethod(id);
    await refresh();
  }

  async function remove(id: string) {
    await payments.removeMethod(id);
    await refresh();
  }

  async function addCard() {
    const digits = number.replace(/\s/g, '');
    const parts = exp.split('/');
    if (parts.length !== 2) return;
    const mm = parseInt(parts[0].trim(), 10);
    const yy = parseInt(parts[1].trim(), 10);
    if (digits.length < 12 || isNaN(mm) || isNaN(yy) || mm < 1 || mm > 12 || cvc.length < 3) {
      return;
    }
    const expYear = yy < 100 ? 2000 + yy : yy; // accept 2-digit or 4-digit year
    setBusy(true);
    try {
      await payments.addCard({ number: digits, expMonth: mm, expYear, cvc });
      setNumber('');
      setExp('');
      setCvc('');
      setAdding(false);
      await refresh();
    } catch (err) {
      console.error('Failed to add card:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="pay-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Payment</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        <View style={styles.banner}>
          <Ionicons name="lock-closed" size={16} color={colors.jade} />
          <Text variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
            Demo billing. The payment layer is gateway-agnostic — Stripe drops in
            without touching the app.
          </Text>
        </View>

        {/* Ez Wallet */}
        <View style={styles.wallet}>
          <View style={styles.walletTop}>
            <View>
              <Text variant="label" color={colors.onInkMuted}>Ez Wallet</Text>
              <Text style={styles.walletBalance} testID="wallet-balance">
                {formatMoney(wallet.balance)}
              </Text>
            </View>
            <View style={styles.walletChip}>
              <Ionicons name="wallet" size={20} color={colors.ink} />
            </View>
          </View>
          <Text variant="small" color={colors.onInkMuted}>
            Credit applies automatically to your next rides.
          </Text>

          <View style={styles.promoRow}>
            <View style={styles.promoInput}>
              <Ionicons name="pricetag-outline" size={16} color={colors.onInkMuted} />
              <TextInput
                testID="promo-input"
                placeholder="Promo code (try EZ10)"
                placeholderTextColor={colors.onInkMuted}
                autoCapitalize="characters"
                value={promo}
                onChangeText={(t) => {
                  setPromo(t);
                  setPromoMsg(null);
                }}
                style={styles.promoField}
              />
            </View>
            <Pressable style={styles.promoBtn} testID="apply-promo" onPress={applyPromo}>
              <Text variant="smallStrong" color={colors.ink}>Apply</Text>
            </Pressable>
          </View>
          {promoMsg ? (
            <Text
              variant="small"
              color={promoMsg.ok ? colors.jade : colors.amber}
              testID="promo-msg"
              style={{ marginTop: space.sm }}
            >
              {promoMsg.text}
            </Text>
          ) : null}
        </View>

        <Eyebrow>Your methods</Eyebrow>
        {methods.map((m) => (
          <View key={m.id} style={styles.method} testID={`method-${m.id}`}>
            <View style={styles.methodIcon}>
              <Ionicons name={BRAND_ICON[m.brand] ?? 'card'} size={20} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{m.label}</Text>
              {m.expMonth ? (
                <Text variant="small" color={colors.textSecondary}>
                  Expires {String(m.expMonth).padStart(2, '0')}/{m.expYear}
                </Text>
              ) : (
                <Text variant="small" color={colors.textSecondary}>
                  Pay the driver directly
                </Text>
              )}
            </View>
            {m.isDefault ? (
              <View style={styles.defaultPill}>
                <Text variant="label" color={colors.jadeDark}>
                  Default
                </Text>
              </View>
            ) : (
              <Pressable onPress={() => makeDefault(m.id)} testID={`default-${m.id}`}>
                <Text variant="smallStrong" color={colors.jade}>
                  Use
                </Text>
              </Pressable>
            )}
            {m.brand !== 'cash' ? (
              <Pressable onPress={() => remove(m.id)} hitSlop={8} testID={`remove-${m.id}`}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ))}

        {adding ? (
          <View style={styles.addForm}>
            <Input label="Card number" placeholder="4242 4242 4242 4242" testID="card-number" value={number} onChangeText={setNumber} keyboardType="number-pad" />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input label="Expiry" placeholder="08/29" testID="card-exp" value={exp} onChangeText={setExp} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="CVC" placeholder="123" testID="card-cvc" value={cvc} onChangeText={setCvc} keyboardType="number-pad" secureTextEntry />
              </View>
            </View>
            <Button label="Save card" variant="go" testID="save-card" loading={busy} onPress={addCard} />
          </View>
        ) : (
          <Pressable style={styles.addBtn} testID="add-card-open" onPress={() => setAdding(true)}>
            <Ionicons name="add" size={22} color={colors.jade} />
            <Text variant="bodyStrong" color={colors.jade}>
              Add a card
            </Text>
          </Pressable>
        )}
      </ScrollView>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.jadeSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.xl,
  },
  wallet: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  walletBalance: { fontFamily: fonts.monoBold, fontSize: 30, color: colors.onInk, marginVertical: 2 },
  walletChip: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.jade, alignItems: 'center', justifyContent: 'center' },
  promoRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  promoInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 48,
  },
  promoField: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInk, height: '100%' },
  promoBtn: {
    backgroundColor: colors.jade,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPill: {
    backgroundColor: colors.jadeSoft,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.jade,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
  },
  addForm: { gap: space.md, marginTop: space.lg },
  formRow: { flexDirection: 'row', gap: space.md },
  fontHint: { fontFamily: fonts.mono },
});
