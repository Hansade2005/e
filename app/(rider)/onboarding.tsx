import { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useOnboarding } from '@/store/onboarding';
import { colors, radius, space } from '@/theme/tokens';

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  permission?: boolean;
};

const SLIDES: Slide[] = [
  {
    icon: 'navigate',
    eyebrow: 'How Ez2go works',
    title: 'Tap a pin.\nRide in minutes.',
    body: 'Set your destination, pick Ez Go, XL, or Premium, and watch your driver roll in on a live map.',
    cta: 'Next',
  },
  {
    icon: 'cash',
    eyebrow: 'Fair by design',
    title: 'You save.\nDrivers keep 100%.',
    body: 'No 40% platform cut — fares run about 20% under Uber and Lyft, and every dollar of the fare goes to your driver.',
    cta: 'Next',
  },
  {
    icon: 'locate',
    eyebrow: 'One quick thing',
    title: 'Find rides\nnear you.',
    body: 'Allow location so we can match you with the closest driver and set your pickup automatically.',
    cta: 'Allow location',
    permission: true,
  },
];

export default function RiderOnboarding() {
  const insets = useSafeAreaInsets();
  const completeRider = useOnboarding((s) => s.completeRider);
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  async function finish() {
    await completeRider();
    router.replace('/(rider)/home');
  }

  async function next() {
    if (slide.permission && Platform.OS !== 'web') {
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch {
        /* continue regardless */
      }
    }
    if (last) await finish();
    else setIndex((i) => i + 1);
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.md }]}>
      <View style={styles.top}>
        <Logo size={24} />
        <Pressable onPress={finish} hitSlop={10} testID="onb-skip">
          <Text variant="smallStrong" color={colors.textSecondary}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.art}>
          <View style={styles.artRing}>
            <Ionicons name={slide.icon} size={56} color={colors.jade} />
          </View>
        </View>

        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <Text variant="hero" style={styles.title}>{slide.title}</Text>
        <Text variant="body" color={colors.textSecondary} style={styles.copy}>
          {slide.body}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={last ? 'Start riding' : slide.cta}
          variant="primary"
          testID="onb-next"
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: space.xl },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, justifyContent: 'center' },
  art: { alignItems: 'center', marginBottom: space.xxl },
  artRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.jadeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.jade,
  },
  title: { marginTop: space.sm },
  copy: { marginTop: space.lg, maxWidth: 360 },
  footer: { gap: space.lg },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  dotActive: { width: 26, backgroundColor: colors.jade },
});
