import { router } from 'expo-router';
import { Chat } from '@/components/Chat';
import { askEz } from '@/lib/ai';
import { colors } from '@/theme/tokens';

const QUICK = [
  'Cheapest ride to the airport',
  'How do I schedule a ride?',
  'Any promo codes?',
  'Is my trip safe?',
];

export default function Assistant() {
  return (
    <Chat
      peerName="Ez Assistant"
      peerColor={colors.jade}
      peerSubtitle="AI ride concierge"
      greeting="Hi! I'm Ez, your ride assistant. Ask me about fares, destinations, scheduling, or your wallet — anything to get you moving."
      quickReplies={QUICK}
      autoReply={(text, history) => askEz(history, text)}
      onBack={() => router.back()}
      showCall={false}
    />
  );
}
