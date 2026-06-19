import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function RiderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="search" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="tracking" options={{ animation: 'fade' }} />
      <Stack.Screen name="complete" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
