import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

export function Stars({
  value,
  size = 18,
  onChange,
  color = colors.amber,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        const star = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? color : colors.textMuted}
          />
        );
        return onChange ? (
          <Pressable
            key={i}
            testID={`star-${i}`}
            onPress={() => onChange(i)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${i} stars`}
          >
            {star}
          </Pressable>
        ) : (
          <View key={i}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
