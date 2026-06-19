import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink },
      }}
    >
      <Stack.Screen name="trip" options={{ animation: 'fade' }} />
    </Stack>
  );
}
