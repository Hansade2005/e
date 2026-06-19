import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useRide } from '@/store/ride';
import { colors, radius, space, fonts } from '@/theme/tokens';

type Msg = { id: string; from: 'me' | 'driver'; text: string; at: number };

const QUICK = ["I'm coming out now", 'Please wait 2 min', 'Where are you?', 'Thanks!'];

const AUTO_REPLIES: Record<string, string> = {
  "I'm coming out now": 'Great, I see you. Pulling up to the curb.',
  'Please wait 2 min': 'No problem — take your time.',
  'Where are you?': "I'm at the corner by the entrance, silver Prius.",
  'Thanks!': '👍 See you in a sec.',
};

export default function Chat() {
  const insets = useSafeAreaInsets();
  const driver = useRide((s) => s.driver);
  const scroller = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'm0',
      from: 'driver',
      text: `Hi! This is ${driver?.name?.split(' ')[0] ?? 'your driver'}. On my way to you now.`,
      at: Date.now() - 60000,
    },
  ]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages]);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    setDraft('');
    setMessages((m) => [...m, { id: 'me' + Date.now(), from: 'me', text: t, at: Date.now() }]);
    const reply = AUTO_REPLIES[t] ?? 'Got it 👍';
    setTimeout(() => {
      setMessages((m) => [...m, { id: 'd' + Date.now(), from: 'driver', text: reply, at: Date.now() }]);
    }, 1100);
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="chat-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Avatar name={driver?.name ?? 'Driver'} color={driver?.avatarColor} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{driver?.name ?? 'Your driver'}</Text>
          <View style={styles.online}>
            <View style={styles.onlineDot} />
            <Text variant="small" color={colors.textSecondary}>
              {driver ? `${driver.color} ${driver.car}` : 'En route'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.callBtn} testID="chat-call">
          <Ionicons name="call" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        style={styles.thread}
        contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubbleRow, m.from === 'me' ? styles.rowMe : styles.rowThem]}
          >
            <View style={[styles.bubble, m.from === 'me' ? styles.me : styles.them]}>
              <Text variant="body" color={m.from === 'me' ? colors.white : colors.textPrimary}>
                {m.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* quick replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quick}
      >
        {QUICK.map((q) => (
          <Pressable key={q} style={styles.chip} testID={`quick-${q}`} onPress={() => send(q)}>
            <Text variant="smallStrong" color={colors.ink}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* composer */}
      <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
        <TextInput
          testID="chat-input"
          style={styles.input}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft)}
          returnKeyType="send"
        />
        <Pressable
          testID="chat-send"
          style={[styles.send, !draft.trim() && { opacity: 0.4 }]}
          onPress={() => send(draft)}
          disabled={!draft.trim()}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
  },
  online: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.jade },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: { flex: 1 },
  bubbleRow: { flexDirection: 'row' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.lg },
  me: { backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  them: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, ...{} },
  quick: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: 38,
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
