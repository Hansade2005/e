import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, type } from '@/theme/tokens';

type Variant = keyof typeof type;

type Props = RNTextProps & {
  variant?: Variant;
  color?: string;
  center?: boolean;
};

export function Text({ variant = 'body', color, center, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant] as any,
        { color: color ?? colors.textPrimary },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
