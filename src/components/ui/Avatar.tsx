import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from '@/theme/tokens';

export function Avatar({
  name,
  color = colors.jade,
  size = 44,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.36, color: colors.white }}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
