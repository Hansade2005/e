import { router } from 'expo-router';
import { Platform, Linking } from 'react-native';
import { Chat } from '@/components/Chat';
import { useRide } from '@/store/ride';

const QUICK = ["I'm coming out now", 'Please wait 2 min', 'Where are you?', 'Thanks!'];

const REPLIES: Record<string, string> = {
  "I'm coming out now": 'Great, I see you. Pulling up to the curb.',
  'Please wait 2 min': 'No problem — take your time.',
  'Thanks!': '👍 See you in a sec.',
};

export default function RiderChat() {
  const driver = useRide((s) => s.driver);

  function autoReply(text: string): string {
    // Resolve the vehicle dynamically so the reply always matches the real ride.
    if (text === 'Where are you?') {
      return driver
        ? `I'm at the corner by the entrance, ${driver.color} ${driver.car}.`
        : "I'm pulling up now.";
    }
    return REPLIES[text] ?? 'Got it 👍';
  }

  return (
    <Chat
      peerName={driver?.name ?? 'Your driver'}
      peerColor={driver?.avatarColor}
      peerSubtitle={driver ? `${driver.color} ${driver.car}` : 'En route'}
      greeting={`Hi! This is ${driver?.name?.split(' ')[0] ?? 'your driver'}. On my way to you now.`}
      quickReplies={QUICK}
      autoReply={autoReply}
      onBack={() => router.back()}
      onCall={() => {
        if (Platform.OS !== 'web') Linking.openURL('tel:+18165550199').catch(() => {});
      }}
    />
  );
}
