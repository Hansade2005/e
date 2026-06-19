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
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="trip" options={{ animation: 'fade' }} />
      <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="cashout" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
