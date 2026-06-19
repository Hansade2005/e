import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Text } from './Text';
import { colors, radius, space, fonts } from '@/theme/tokens';

type Variant = 'primary' | 'go' | 'dark' | 'ghost' | 'outline';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  onDark?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  icon,
  style,
  testID,
  onDark,
}: Props) {
  const base = VARIANTS[variant];
  // On dark surfaces, ghost/outline need light ink to stay legible.
  const v =
    onDark && (variant === 'ghost' || variant === 'outline')
      ? { ...base, fg: colors.onInk, border: variant === 'outline' ? colors.inkLine : base.border }
      : base;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg },
        v.border ? styles.outline : null,
        fullWidth && styles.full,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.amber, fg: colors.ink }, // signal CTA
  go: { bg: colors.jade, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.onInk },
  ghost: { bg: 'transparent', fg: colors.textPrimary },
  outline: { bg: 'transparent', fg: colors.textPrimary, border: colors.inkLine },
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    borderWidth: 0,
  },
  outline: { borderWidth: 1.5 },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, letterSpacing: 0.2 },
});
