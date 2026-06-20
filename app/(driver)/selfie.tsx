import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/store/auth';
import { useDriver, SELFIE_EVERY } from '@/store/driver';
import { colors, radius, space } from '@/theme/tokens';

type Stage = 'frame' | 'verifying' | 'verified';

export default function Selfie() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const clearSelfie = useDriver((s) => s.clearSelfie);
  const goOnline = useDriver((s) => s.goOnline);
  const [stage, setStage] = useState<Stage>('frame');

  // Simulated face verification (no real camera in the web/demo build). Managed
  // via effect so the timer is cleared if the screen unmounts mid-verify.
  useEffect(() => {
    if (stage !== 'verifying') return;
    const timer = setTimeout(() => setStage('verified'), 1400);
    return () => clearTimeout(timer);
  }, [stage]);

  function capture() {
    setStage('verifying');
  }

  async function done() {
    await clearSelfie();
    goOnline();
    router.back();
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="selfie-back">
          <Ionicons name="chevron-back" size={26} color={colors.onInk} />
        </Pressable>
        <Text variant="bodyStrong" color={colors.onInk}>Safety check</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <Eyebrow color={colors.jade} onDark>{`Every ${SELFIE_EVERY} rides`}</Eyebrow>
        <Text variant="h2" color={colors.onInk} center style={{ marginTop: 4 }}>
          Confirm it&apos;s you
        </Text>
        <Text variant="body" color={colors.onInkMuted} center style={styles.copy}>
          A quick selfie keeps riders safe and makes sure the right driver is behind the wheel.
          We compare it to your profile photo.
        </Text>

        {/* camera frame */}
        <View style={[styles.frame, stage === 'verified' && styles.frameOk]}>
          {stage === 'verified' ? (
            <Avatar name={user?.name ?? 'Driver'} color={colors.jade} size={150} />
          ) : (
            <Ionicons name="person" size={96} color={colors.inkLine} />
          )}
          {stage === 'verifying' ? (
            <View style={styles.scan}>
              <Ionicons name="scan" size={40} color={colors.jade} />
            </View>
          ) : null}
          {stage === 'verified' ? (
            <View style={styles.okBadge}>
              <Ionicons name="checkmark-circle" size={36} color={colors.jade} />
            </View>
          ) : null}
        </View>

        <Text variant="small" color={colors.onInkMuted} center style={{ marginTop: space.lg }}>
          {stage === 'frame'
            ? 'Center your face in the circle.'
            : stage === 'verifying'
              ? 'Verifying…'
              : 'Verified — you’re good to go.'}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        {stage === 'verified' ? (
          <Button label="Continue driving" variant="go" testID="selfie-continue" onPress={done} />
        ) : (
          <Button
            label="Take selfie"
            variant="go"
            testID="selfie-capture"
            loading={stage === 'verifying'}
            onPress={capture}
          />
        )}
      </View>
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
  body: { flex: 1, alignItems: 'center', paddingHorizontal: space.xl, justifyContent: 'center' },
  copy: { marginTop: space.md, marginBottom: space.xxl, maxWidth: 340 },
  frame: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.inkSoft,
    borderWidth: 3,
    borderColor: colors.inkLine,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameOk: { borderColor: colors.jade, borderStyle: 'solid' },
  scan: { position: 'absolute', bottom: 18 },
  okBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.ink,
    borderRadius: 20,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
  },
});
