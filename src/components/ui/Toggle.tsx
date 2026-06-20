import { Pressable, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

export function Toggle({
  value,
  onChange,
  testID,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.jade : colors.surfaceAlt }]}
    >
      <View style={[styles.knob, value ? styles.on : styles.off]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  on: { alignSelf: 'flex-end' },
  off: { alignSelf: 'flex-start' },
});
