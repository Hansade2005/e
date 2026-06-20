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
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="search" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="tracking" options={{ animation: 'fade' }} />
      <Stack.Screen name="complete" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="safety" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="schedule" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="activity" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="assistant" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="invest" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="favorites" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="referral" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
