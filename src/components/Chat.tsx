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
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { isRemoteId } from '@/lib/db';
import { fetchMessages, pollMessages, sendMessage } from '@/lib/live';
import { colors, radius, space, fonts } from '@/theme/tokens';

type Msg = { id: string; from: 'me' | 'peer'; text: string; at: number };

/** When present and the ride is a real Supabase row, chat polls + sends live. */
export type LiveChat = { rideId: string; senderId: string; senderRole: 'rider' | 'driver' };

export type ChatProps = {
  peerName: string;
  peerColor?: string;
  peerSubtitle: string;
  greeting: string;
  quickReplies: string[];
  /**
   * Resolve the peer's reply for a sent message. May be async (e.g. an LLM call);
   * `history` is the prior turns mapped to assistant/user roles.
   */
  autoReply: (
    text: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ) => string | Promise<string>;
  onBack: () => void;
  onCall?: () => void;
  /** Hide the call button (e.g. for the AI assistant). */
  showCall?: boolean;
  /** Enable real poll-based messaging against a Supabase ride. */
  live?: LiveChat;
};

/**
 * Shared messaging thread used by both the rider→driver and driver→rider chats.
 * Auto-reply timeouts are tracked and cleared on unmount so navigating away
 * mid-reply can't update an unmounted component.
 */
export function Chat({
  peerName,
  peerColor,
  peerSubtitle,
  greeting,
  quickReplies,
  autoReply,
  onBack,
  onCall,
  showCall = true,
  live,
}: ChatProps) {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(true);

  const isLive = !!live && isRemoteId(live.rideId) && isRemoteId(live.senderId);

  const [messages, setMessages] = useState<Msg[]>([
    { id: 'm0', from: 'peer', text: greeting, at: Date.now() - 60000 },
  ]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);

  // Merge in server messages, de-duping by id (own + counterpart both poll in).
  const mergeServer = (incoming: { id: string; senderId: string; body: string; createdAt: string }[]) => {
    if (!live) return;
    setMessages((prev) => {
      const have = new Set(prev.map((m) => m.id));
      const add = incoming
        .filter((s) => !have.has(s.id))
        .map((s) => ({
          id: s.id,
          from: (s.senderId === live.senderId ? 'me' : 'peer') as 'me' | 'peer',
          text: s.body,
          at: +new Date(s.createdAt),
        }));
      return add.length ? [...prev, ...add] : prev;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      // Stop pending timers / late async updates after unmount.
      mounted.current = false;
      replyTimers.current.forEach(clearTimeout);
      replyTimers.current = [];
    };
  }, []);

  // Live mode: seed history + poll for new messages.
  useEffect(() => {
    if (!isLive || !live) return;
    let stop = () => {};
    (async () => {
      const seed = await fetchMessages(live.rideId);
      if (mounted.current && seed.length) mergeServer(seed);
      stop = pollMessages(live.rideId, (msgs) => {
        if (mounted.current) mergeServer(msgs);
      });
    })();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, live?.rideId]);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    setDraft('');

    // Real ride chat: persist + let polling reconcile (own message returns with
    // its server id, so it isn't double-shown).
    if (isLive && live) {
      setMessages((m) => [...m, { id: 'local' + Date.now(), from: 'me', text: t, at: Date.now() }]);
      void sendMessage({ rideId: live.rideId, senderId: live.senderId, senderRole: live.senderRole, body: t });
      return;
    }

    const history = messages.map((m) => ({
      role: m.from === 'me' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
    setMessages((m) => [...m, { id: 'me' + Date.now(), from: 'me', text: t, at: Date.now() }]);
    setTyping(true);

    const timer = setTimeout(async () => {
      let reply = '';
      try {
        reply = await Promise.resolve(autoReply(t, history));
      } catch {
        reply = 'Sorry — I had trouble with that. Try again?';
      }
      if (!mounted.current) return;
      setTyping(false);
      setMessages((m) => [...m, { id: 'p' + Date.now(), from: 'peer', text: reply, at: Date.now() }]);
    }, 600);
    replyTimers.current.push(timer);
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={onBack} hitSlop={10} testID="chat-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Avatar name={peerName} color={peerColor} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{peerName}</Text>
          <View style={styles.online}>
            <View style={styles.onlineDot} />
            <Text variant="small" color={colors.textSecondary}>
              {peerSubtitle}
            </Text>
          </View>
        </View>
        {showCall ? (
          <Pressable style={styles.callBtn} testID="chat-call" onPress={onCall}>
            <Ionicons name="call" size={18} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView ref={scroller} style={styles.thread} contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, m.from === 'me' ? styles.rowMe : styles.rowThem]}>
            <View
              testID={m.from === 'me' ? 'msg-me' : 'msg-peer'}
              style={[styles.bubble, m.from === 'me' ? styles.me : styles.them]}
            >
              <Text variant="body" color={m.from === 'me' ? colors.white : colors.textPrimary}>
                {m.text}
              </Text>
            </View>
          </View>
        ))}
        {typing ? (
          <View style={[styles.bubbleRow, styles.rowThem]} testID="chat-typing">
            <View style={[styles.bubble, styles.them, styles.typing]}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, { opacity: 0.6 }]} />
              <View style={[styles.typingDot, { opacity: 0.35 }]} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick}>
        {quickReplies.map((q) => (
          <Pressable key={q} style={styles.chip} testID={`quick-${q}`} onPress={() => send(q)}>
            <Text variant="smallStrong" color={colors.ink}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

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
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  thread: { flex: 1 },
  bubbleRow: { flexDirection: 'row' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.lg },
  me: { backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  them: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  typing: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
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
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.jade, alignItems: 'center', justifyContent: 'center' },
});
