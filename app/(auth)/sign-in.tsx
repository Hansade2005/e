import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!/\S+@\S+/.test(email) || password.length < 1) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      const role = useAuth.getState().user?.role;
      router.replace(role === 'driver' ? '/(driver)/dashboard' : '/(rider)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Could not sign in. Check your email and password.');
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
          <Eyebrow onDark>Welcome back</Eyebrow>
          <Text variant="h1" color={colors.onInk}>
            Pick up where{'\n'}you left off.
          </Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Your password"
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
            label="Sign in"
            variant="primary"
            testID="submit-signin"
            loading={loading}
            onPress={submit}
          />
          <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
            <Text variant="small" color={colors.onInkMuted} center>
              New here? <Text variant="smallStrong" color={colors.jade}>Create an account</Text>
            </Text>
          </Pressable>
        </View>
        <View style={{ height: insets.bottom + space.lg }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  back: { width: 40, height: 40, justifyContent: 'center' },
  head: { marginTop: space.lg, marginBottom: space.xxl, gap: 4 },
  form: { gap: space.md },
  actions: { marginTop: space.xl, gap: space.lg },
});
