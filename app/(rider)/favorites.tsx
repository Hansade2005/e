import { useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useFavorites } from '@/store/favorites';
import { colors, radius, space } from '@/theme/tokens';

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const favorites = useFavorites((s) => s.favorites);
  const load = useFavorites((s) => s.load);
  const remove = useFavorites((s) => s.remove);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="favorites-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Favorite drivers</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.ref}
        contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={28} color={colors.textMuted} />
            </View>
            <Text variant="h3" center style={{ marginTop: space.lg }}>No favorites yet</Text>
            <Text variant="body" color={colors.textSecondary} center style={{ marginTop: 4 }}>
              After a great ride, tap the heart to save a driver. Request them again with “Favorite
              driver” when you book.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row} testID={`fav-${item.ref}`}>
            <Avatar name={item.name} color={item.avatarColor} size={48} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{item.name}</Text>
              <Text variant="small" color={colors.textSecondary}>{item.vehicle}</Text>
            </View>
            <Pressable onPress={() => remove(item.ref)} hitSlop={8} testID={`fav-remove-${item.ref}`}>
              <Ionicons name="heart" size={22} color={colors.amber} />
            </Pressable>
          </View>
        )}
      />
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.sm,
  },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
