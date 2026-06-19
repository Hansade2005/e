import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/store/auth';
import { Logo } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { colors, space } from '@/theme/tokens';

export default function Index() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anon' || !user) {
      router.replace('/welcome');
    } else if (user.role === 'driver') {
      router.replace('/(driver)/dashboard');
    } else {
      router.replace('/(rider)/home');
    }
  }, [status, user]);

  return (
    <View style={styles.fill}>
      <Logo size={44} onDark />
      <Text variant="label" color={colors.onInkMuted} style={styles.tag}>
        Your city, in motion
      </Text>
      <ActivityIndicator color={colors.jade} style={{ marginTop: space.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tag: { marginTop: space.md },
});
