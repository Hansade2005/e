import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from '@/theme/tokens';

export function Card({
  children,
  style,
  flat = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  flat?: boolean;
}) {
  return <View style={[styles.card, !flat && shadow.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
  },
});
