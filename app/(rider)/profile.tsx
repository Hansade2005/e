import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useAuth } from '@/store/auth';
import { useRide } from '@/store/ride';
import { useOnboarding } from '@/store/onboarding';
import { colors, radius, space, fonts } from '@/theme/tokens';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const switchRole = useAuth((s) => s.switchRole);
  const signOut = useAuth((s) => s.signOut);
  const history = useRide((s) => s.history);
  const driverDone = useOnboarding((s) => s.driverDone);

  const totalSpent = history.reduce((s, r) => s + r.fare, 0);

  async function becomeDriver() {
    await switchRole('driver');
    // Demo guests skip setup; real drivers complete onboarding once.
    const ready = user?.isGuest || driverDone;
    router.replace(ready ? '/(driver)/dashboard' : '/(driver)/onboarding');
  }

  async function logout() {
    await signOut();
    router.replace('/(auth)/welcome');
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="profile-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Account</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        <View style={styles.identity}>
          <Avatar name={user?.name ?? 'Rider'} color={user?.avatarColor} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="h2">{user?.name}</Text>
            <Text variant="small" color={colors.textSecondary}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={user?.rating?.toFixed(2) ?? '5.0'} label="Rating" />
          <View style={styles.statDiv} />
          <Stat value={String(history.length)} label="Trips" />
          <View style={styles.statDiv} />
          <Stat value={`$${totalSpent.toFixed(0)}`} label="Spent" />
        </View>

        {/* Become a driver */}
        <Pressable style={styles.driverCta} testID="become-driver" onPress={becomeDriver}>
          <View style={styles.driverIcon}>
            <Ionicons name="car-sport" size={22} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={colors.onInk}>
              Switch to driving
            </Text>
            <Text variant="small" color={colors.onInkMuted}>
              Keep 100% of every fare you earn
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.jade} />
        </Pressable>

        <Eyebrow>Manage</Eyebrow>
        <View style={styles.menu}>
          <MenuItem icon="receipt-outline" label="Ride history" onPress={() => router.push('/(rider)/history')} testID="menu-history" />
          <MenuItem icon="card-outline" label="Payment methods" onPress={() => router.push('/(rider)/payment-methods')} testID="menu-payments" />
          <MenuItem icon="bookmark-outline" label="Saved places" onPress={() => router.push('/(rider)/saved-places')} testID="menu-places" />
          <MenuItem icon="trending-up-outline" label="Own Ez2go" onPress={() => router.push('/(rider)/invest')} testID="menu-invest" />
          <MenuItem icon="sparkles-outline" label="Ask Ez (AI assistant)" onPress={() => router.push('/(rider)/assistant')} testID="menu-assistant" />
          <MenuItem icon="shield-checkmark-outline" label="Safety toolkit" onPress={() => router.push('/(rider)/safety')} testID="menu-safety" />
          <MenuItem icon="help-circle-outline" label="Help & support" />
        </View>

        <Pressable style={styles.signOut} testID="sign-out" onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text variant="bodyStrong" color={colors.danger}>
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text variant="label" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress} testID={testID}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={colors.ink} />
      </View>
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
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
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    marginTop: space.xl,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.ink },
  statDiv: { width: 1, height: 28, backgroundColor: colors.surfaceAlt },
  driverCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    marginVertical: space.xl,
  },
  driverIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: space.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.canvas,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: space.xl,
    paddingVertical: space.lg,
  },
});
