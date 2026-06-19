import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Stars } from '@/components/ui/Stars';
import { useRide } from '@/store/ride';
import { formatMoney } from '@/constants/vehicles';
import { colors, radius, space, fonts } from '@/theme/tokens';

export default function History() {
  const insets = useSafeAreaInsets();
  const history = useRide((s) => s.history);

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="history-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Your trips</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="map-outline" size={28} color={colors.textMuted} />
            </View>
            <Text variant="h3" center style={{ marginTop: space.lg }}>
              No trips yet
            </Text>
            <Text variant="body" color={colors.textSecondary} center style={{ marginTop: 4 }}>
              Book your first ride and it&apos;ll show up here.
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.replace('/(rider)/home')}>
              <Text variant="bodyStrong" color={colors.jade}>
                Find a ride
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            testID={`trip-${item.id}`}
            onPress={() => router.push({ pathname: '/(rider)/trip-details', params: { id: item.id } })}
          >
            <View style={styles.cardTop}>
              <Eyebrow>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Eyebrow>
              <Text style={styles.fare}>{formatMoney(item.fare)}</Text>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routeMarks}>
                <View style={[styles.dot, { backgroundColor: colors.jade }]} />
                <View style={styles.connector} />
                <View style={[styles.square, { backgroundColor: colors.ink }]} />
              </View>
              <View style={{ flex: 1, gap: 12 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.pickup.name}
                </Text>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.destination.name}
                </Text>
              </View>
            </View>
            <View style={styles.cardFoot}>
              <Text variant="small" color={colors.textSecondary}>
                {item.vehicleName} · {item.driverName}
              </Text>
              {item.rating ? <Stars value={item.rating} size={13} /> : (
                <Text variant="small" color={colors.textMuted}>Not rated</Text>
              )}
            </View>
          </Pressable>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fare: { fontFamily: fonts.monoBold, fontSize: 18, color: colors.ink },
  routeRow: { flexDirection: 'row', gap: space.md, marginVertical: space.sm },
  routeMarks: { alignItems: 'center', paddingTop: 6 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  square: { width: 11, height: 11, borderRadius: 3 },
  connector: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.surfaceAlt, marginVertical: 3 },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.canvas,
    paddingTop: space.md,
    marginTop: space.xs,
  },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtn: { marginTop: space.lg, padding: space.md },
});
