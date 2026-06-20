import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useOnboarding, type DriverSetup } from '@/store/onboarding';
import { colors, radius, space } from '@/theme/tokens';

const PAYOUTS = [
  { id: 'debit', label: 'Instant to debit', sub: 'Cash out anytime, no fee' },
  { id: 'bank', label: 'Bank account', sub: 'Weekly direct deposit' },
  { id: 'wallet', label: 'Ez Wallet', sub: 'Keep earnings in-app' },
];

const STEPS = ['Vehicle', 'Documents', 'Payout'];

export default function DriverOnboarding() {
  const insets = useSafeAreaInsets();
  const saveDriver = useOnboarding((s) => s.saveDriver);

  const [step, setStep] = useState(0);
  const [f, setF] = useState<DriverSetup>({
    make: '',
    model: '',
    year: '',
    color: '',
    plate: '',
    license: '',
    insurance: '',
    payout: 'debit',
    gender: '',
  });
  const set = (k: keyof DriverSetup) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const valid =
    step === 0
      ? f.make.trim() && f.model.trim() && f.plate.trim() && f.gender
      : step === 1
        ? f.license.trim().length >= 4 && f.insurance.trim()
        : !!f.payout;

  async function next() {
    if (!valid) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    await saveDriver(f);
    router.replace('/(driver)/dashboard');
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Pressable
          onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
          hitSlop={10}
          testID="drv-onb-back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.onInk} />
        </Pressable>
        <Text variant="bodyStrong" color={colors.onInk}>Driver setup</Text>
        <Text variant="label" color={colors.onInkMuted}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      {/* progress */}
      <View style={styles.progress}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.progStep}>
            <View style={[styles.progBar, i <= step && styles.progBarActive]} />
            <Text variant="label" color={i <= step ? colors.jade : colors.onInkMuted}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Eyebrow onDark>Your vehicle</Eyebrow>
            <Text variant="h2" color={colors.onInk} style={styles.h}>What are you driving?</Text>
            <View style={styles.form}>
              <Input label="Make" placeholder="Toyota" testID="drv-make" value={f.make} onChangeText={set('make')} autoCapitalize="words" />
              <Input label="Model" placeholder="Prius" testID="drv-model" value={f.model} onChangeText={set('model')} autoCapitalize="words" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Year" placeholder="2022" testID="drv-year" value={f.year} onChangeText={set('year')} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Color" placeholder="Silver" testID="drv-color" value={f.color} onChangeText={set('color')} autoCapitalize="words" />
                </View>
              </View>
              <Input label="License plate" placeholder="EZ-4821" testID="drv-plate" value={f.plate} onChangeText={set('plate')} autoCapitalize="characters" />
              <Text variant="smallStrong" color={colors.onInkMuted} style={{ marginTop: space.xs }}>
                Gender (used for riders who request a preference)
              </Text>
              <View style={styles.genderRow}>
                {[
                  { id: 'female', label: 'Woman' },
                  { id: 'male', label: 'Man' },
                  { id: 'other', label: 'Other' },
                ].map((g) => {
                  const active = f.gender === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      testID={`drv-gender-${g.id}`}
                      onPress={() => set('gender')(g.id)}
                      style={[styles.gender, active && styles.genderActive]}
                    >
                      <Text variant="bodyStrong" color={active ? colors.ink : colors.onInk}>{g.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : step === 1 ? (
          <>
            <Eyebrow onDark>Documents</Eyebrow>
            <Text variant="h2" color={colors.onInk} style={styles.h}>Verify to drive</Text>
            <Text variant="small" color={colors.onInkMuted} style={{ marginBottom: space.lg }}>
              We confirm your license and insurance to keep riders safe.
            </Text>
            <View style={styles.form}>
              <Input label="Driver's license #" placeholder="D-1234567" testID="drv-license" value={f.license} onChangeText={set('license')} autoCapitalize="characters" />
              <Input label="Insurance provider" placeholder="State Farm" testID="drv-insurance" value={f.insurance} onChangeText={set('insurance')} autoCapitalize="words" />
              <View style={styles.upload}>
                <Ionicons name="cloud-upload-outline" size={22} color={colors.jade} />
                <View style={{ flex: 1 }}>
                  <Text variant="smallStrong" color={colors.onInk}>Upload documents</Text>
                  <Text variant="small" color={colors.onInkMuted}>Photo of license & insurance card</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={colors.jade} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Eyebrow onDark>Get paid</Eyebrow>
            <Text variant="h2" color={colors.onInk} style={styles.h}>How do you cash out?</Text>
            <Text variant="small" color={colors.onInkMuted} style={{ marginBottom: space.lg }}>
              You keep 100% of every fare — Ez2go takes no cut.
            </Text>
            <View style={styles.form}>
              {PAYOUTS.map((p) => {
                const active = f.payout === p.id;
                return (
                  <Pressable
                    key={p.id}
                    testID={`payout-${p.id}`}
                    onPress={() => set('payout')(p.id)}
                    style={[styles.payout, active && styles.payoutActive]}
                  >
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" color={colors.onInk}>{p.label}</Text>
                      <Text variant="small" color={colors.onInkMuted}>{p.sub}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label={step === STEPS.length - 1 ? 'Finish & go online' : 'Continue'}
          variant="go"
          testID="drv-onb-next"
          disabled={!valid}
          onPress={next}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  progress: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, marginBottom: space.lg },
  progStep: { flex: 1, gap: 6 },
  progBar: { height: 4, borderRadius: 2, backgroundColor: colors.inkLine },
  progBarActive: { backgroundColor: colors.jade },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  h: { marginTop: 4, marginBottom: space.lg },
  form: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  genderRow: { flexDirection: 'row', gap: space.sm },
  gender: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderActive: { backgroundColor: colors.jade, borderColor: colors.jade },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
    borderStyle: 'dashed',
    padding: space.lg,
  },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
    padding: space.lg,
  },
  payoutActive: { borderColor: colors.jade, backgroundColor: '#0F2A2A' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.onInkMuted, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.jade },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.jade },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.inkLine },
});
