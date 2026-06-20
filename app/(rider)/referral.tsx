import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Share, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useReferral, INVITE_CREDIT } from '@/store/referral';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space, fonts } from '@/theme/tokens';

export default function Referral() {
  const insets = useSafeAreaInsets();
  const { code, appliedCode, earned, load, applyCode } = useReferral();
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  async function share() {
    const message = `Join me on Ez2go — fair-priced rides where drivers keep 100%. Use my code ${code} and we both get ${formatMoney(INVITE_CREDIT)}. https://ez2go.app`;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard?.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } else {
        await Share.share({ message });
      }
    } catch {
      /* ignore */
    }
  }

  async function redeem() {
    const res = await applyCode(input);
    setMsg({ ok: res.ok, text: res.message });
    if (res.ok) setInput('');
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="referral-back">
          <Ionicons name="chevron-back" size={26} color={colors.onInk} />
        </Pressable>
        <Text variant="bodyStrong" color={colors.onInk}>Refer & earn</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        <View style={styles.hero}>
          <View style={styles.giftIcon}>
            <Ionicons name="gift" size={28} color={colors.ink} />
          </View>
          <Text variant="h1" color={colors.onInk} center style={{ marginTop: space.lg }}>
            Give {formatMoney(INVITE_CREDIT)}, get {formatMoney(INVITE_CREDIT)}
          </Text>
          <Text variant="body" color={colors.onInkMuted} center style={{ marginTop: space.sm }}>
            Share your code. When a friend takes their first ride, you both get {formatMoney(INVITE_CREDIT)}
            in Ez Wallet credit.
          </Text>
        </View>

        {/* code */}
        <Eyebrow color={colors.jade} onDark>Your code</Eyebrow>
        <Pressable style={styles.codeBox} testID="referral-share" onPress={share}>
          <Text style={styles.code} testID="referral-code">{code || '…'}</Text>
          <View style={styles.shareBtn}>
            <Ionicons name={copied ? 'checkmark' : 'share-social'} size={16} color={colors.ink} />
            <Text variant="smallStrong" color={colors.ink}>{copied ? 'Copied' : 'Share'}</Text>
          </View>
        </Pressable>

        {/* earned */}
        <View style={styles.statRow}>
          <Ionicons name="wallet" size={18} color={colors.jade} />
          <Text variant="smallStrong" color={colors.onInk} style={{ flex: 1 }}>
            Earned from referrals
          </Text>
          <Text style={styles.earned}>{formatMoney(earned)}</Text>
        </View>

        {/* redeem */}
        <View style={{ height: space.lg }} />
        <Eyebrow color={colors.onInkMuted} onDark>Have a friend&apos;s code?</Eyebrow>
        {appliedCode ? (
          <View style={styles.redeemed} testID="referral-redeemed">
            <Ionicons name="checkmark-circle" size={18} color={colors.jade} />
            <Text variant="smallStrong" color={colors.onInk}>
              Redeemed {appliedCode} · {formatMoney(INVITE_CREDIT)} added
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.redeemRow}>
              <TextInput
                testID="referral-input"
                placeholder="Enter code"
                placeholderTextColor={colors.onInkMuted}
                autoCapitalize="characters"
                value={input}
                onChangeText={(t) => {
                  setInput(t);
                  setMsg(null);
                }}
                style={styles.input}
              />
              <Pressable style={styles.redeemBtn} testID="referral-redeem" onPress={redeem}>
                <Text variant="smallStrong" color={colors.ink}>Redeem</Text>
              </Pressable>
            </View>
            {msg ? (
              <Text
                variant="small"
                color={msg.ok ? colors.jade : colors.amber}
                testID="referral-msg"
                style={{ marginTop: space.sm }}
              >
                {msg.text}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
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
  hero: { alignItems: 'center', marginBottom: space.xl },
  giftIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
    borderStyle: 'dashed',
    padding: space.lg,
    marginTop: space.sm,
  },
  code: { fontFamily: fonts.monoBold, fontSize: 26, color: colors.onInk, letterSpacing: 3 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.jade,
    paddingHorizontal: space.md,
    height: 38,
    borderRadius: radius.pill,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  earned: { fontFamily: fonts.monoBold, fontSize: 18, color: colors.jade },
  redeemRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    fontFamily: fonts.monoBold,
    fontSize: 15,
    color: colors.onInk,
    letterSpacing: 2,
  },
  redeemBtn: {
    backgroundColor: colors.jade,
    paddingHorizontal: space.lg,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F2A2A',
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.sm,
  },
});
