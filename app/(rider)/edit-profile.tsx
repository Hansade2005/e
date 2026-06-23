import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 1;

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      router.back();
    } catch {
      Alert.alert('Could not save', 'We couldn’t update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="edit-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Edit profile</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <Avatar name={name || 'Rider'} color={user?.avatarColor} size={84} />
          <Text variant="small" color={colors.textSecondary} style={{ marginTop: space.sm }}>
            {user?.email}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full name"
            placeholder="Your name"
            testID="edit-name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label="Phone"
            placeholder="(555) 123-4567"
            testID="edit-phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label="Save changes" variant="primary" testID="edit-save" loading={saving} disabled={!valid} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
  },
  avatarWrap: { alignItems: 'center', marginVertical: space.lg },
  form: { gap: space.md },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
});
