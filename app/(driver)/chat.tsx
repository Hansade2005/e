import { router } from 'expo-router';
import { Platform, Linking } from 'react-native';
import { Chat } from '@/components/Chat';
import { useDriver } from '@/store/driver';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme/tokens';

const QUICK = ["I'm 2 minutes away", "I'm outside", 'On my way', 'See you soon'];

const REPLIES: Record<string, string> = {
  "I'm 2 minutes away": 'Great, thank you!',
  "I'm outside": "Perfect, I'll be right out.",
  'On my way': 'No rush, see you soon.',
  'See you soon': '👍',
};

export default function DriverChat() {
  const request = useDriver((s) => s.request);
  const userId = useAuth((s) => s.user?.id);
  const riderName = request?.rider ?? 'Rider';

  return (
    <Chat
      peerName={riderName}
      peerColor={colors.amber}
      peerSubtitle={request ? `Pickup at ${request.pickup.name}` : 'Your rider'}
      greeting={`Hi ${riderName.split(' ')[0]}, this is your driver — I'll be there shortly.`}
      quickReplies={QUICK}
      autoReply={(t) => REPLIES[t] ?? 'Sounds good 👍'}
      live={request?.liveId && userId ? { rideId: request.liveId, senderId: userId, senderRole: 'driver' } : undefined}
      onBack={() => router.back()}
      onCall={() => {
        if (Platform.OS !== 'web') Linking.openURL('tel:+18165550142').catch(() => {});
      }}
    />
  );
}
