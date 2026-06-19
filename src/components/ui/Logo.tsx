import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from '@/theme/tokens';

/**
 * Ez2go wordmark. The "2" is the brand's pivot — drawn in Signal-Amber and
 * flanked by a tiny route node, echoing the wayfinding "route line" motif.
 */
export function Logo({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const base = onDark ? colors.onInk : colors.ink;
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Ez2go">
      <Text style={[styles.word, { fontSize: size, color: base }]}>Ez</Text>
      <View style={[styles.node, { width: size * 0.62, height: size * 0.62, borderRadius: size }]}>
        <Text style={[styles.two, { fontSize: size * 0.5 }]}>2</Text>
      </View>
      <Text style={[styles.word, { fontSize: size, color: base }]}>go</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { fontFamily: fonts.display, letterSpacing: -1 },
  node: {
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  two: { fontFamily: fonts.display, color: colors.ink, marginTop: -1 },
});
