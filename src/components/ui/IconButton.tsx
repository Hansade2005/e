import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/theme/tokens';

export function IconButton({
  name,
  onPress,
  color = colors.ink,
  bg = colors.surface,
  size = 22,
  testID,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  bg?: string;
  size?: number;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: bg }, shadow.float, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
