import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, space } from '@/theme/tokens';

/**
 * Wayfinding eyebrow: a short mono label preceded by a route node + tick,
 * the recurring structural device of the app.
 */
export function Eyebrow({
  children,
  color = colors.jade,
  onDark = false,
}: {
  children: string;
  color?: string;
  onDark?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.node, { backgroundColor: color }]} />
      <View style={[styles.tick, { backgroundColor: color }]} />
      <Text variant="label" color={onDark ? colors.onInkMuted : colors.textSecondary}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.sm },
  node: { width: 7, height: 7, borderRadius: 4 },
  tick: { width: 14, height: 2, borderRadius: 2, marginRight: 2 },
});
