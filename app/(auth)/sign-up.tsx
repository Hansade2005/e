import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useAuth, type Role } from '@/store/auth';
import { colors, radius, space } from '@/theme/tokens';

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const signUp = useAuth((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('rider');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length > 1 && /\S+@\S+/.test(email) && password.length >= 6;

  async function submit() {
    if (!valid) {
      setError('Add your name, a valid email, and a 6+ character password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), password, role });
      // New accounts go through role-specific onboarding first.
      router.replace(role === 'driver' ? '/(driver)/onboarding' : '/(rider)/onboarding');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create your account. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.onInk} />
        </Pressable>

        <View style={styles.head}>
          <Eyebrow onDark>Create account</Eyebrow>
          <Text variant="h1" color={colors.onInk}>
            Let&apos;s get you moving.
          </Text>
        </View>

        {/* role selector */}
        <View style={styles.roles}>
          <RolePick
            active={role === 'rider'}
            onPress={() => setRole('rider')}
            icon="person"
            title="Ride"
            sub="Get where you're going"
            testID="role-rider"
          />
          <RolePick
            active={role === 'driver'}
            onPress={() => setRole('driver')}
            icon="car-sport"
            title="Drive"
            sub="Earn 100% of fares"
            testID="role-driver"
          />
        </View>

        <View style={styles.form}>
          <Input
            label="Full name"
            placeholder="Alex Rivera"
            testID="input-name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label="Email"
            placeholder="you@email.com"
            testID="input-email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="At least 6 characters"
            testID="input-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? (
            <Text variant="small" color={colors.amber}>
              {error}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Create account"
            variant="primary"
            testID="submit-signup"
            loading={loading}
            onPress={submit}
          />
          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Text variant="small" color={colors.onInkMuted} center>
              Already have an account? <Text variant="smallStrong" color={colors.jade}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
        <View style={{ height: insets.bottom + space.lg }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RolePick({
  active,
  onPress,
  icon,
  title,
  sub,
  testID,
}: {
  active: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.role, active && styles.roleActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.roleIcon, active && { backgroundColor: colors.jade }]}>
        <Ionicons name={icon} size={20} color={active ? colors.white : colors.onInkMuted} />
      </View>
      <Text variant="bodyStrong" color={active ? colors.onInk : colors.onInkMuted}>
        {title}
      </Text>
      <Text variant="small" color={colors.onInkMuted}>
        {sub}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  back: { width: 40, height: 40, justifyContent: 'center' },
  head: { marginTop: space.lg, marginBottom: space.xl, gap: 4 },
  roles: { flexDirection: 'row', gap: space.md },
  role: {
    flex: 1,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
    padding: space.lg,
    gap: 4,
  },
  roleActive: { borderColor: colors.jade, backgroundColor: '#0F2A2A' },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  form: { marginTop: space.xl, gap: space.md },
  actions: { marginTop: space.xl, gap: space.lg },
});
