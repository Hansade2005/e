import { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, radius, fonts, space } from '@/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  icon?: React.ReactNode;
  testID?: string;
};

export function Input({ label, icon, style, testID, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="smallStrong" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, focused && styles.focused]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          testID={testID}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style as any]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    paddingHorizontal: space.md,
    height: 54,
    gap: 10,
  },
  focused: { borderColor: colors.jade },
  icon: {},
  input: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.textPrimary,
    height: '100%',
  },
});
