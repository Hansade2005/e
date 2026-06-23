import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useRide } from '@/store/ride';
import { searchPlaces, localPlaces, type Place } from '@/lib/geo';
import { colors, radius, space } from '@/theme/tokens';

export default function Search() {
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isStop = mode === 'stop';
  const setDestination = useRide((s) => s.setDestination);
  const addStop = useRide((s) => s.addStop);
  const pickup = useRide((s) => s.pickup);
  const history = useRide((s) => s.history);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await searchPlaces(query);
      // Ignore results from a superseded query or after unmount.
      if (!active) return;
      setResults(r);
      setLoading(false);
    }, 350);
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  async function choose(place: Place) {
    if (isStop) {
      await addStop(place);
      router.back();
      return;
    }
    await setDestination(place);
    router.replace('/(rider)/select-ride');
  }

  const suggestions =
    query.trim().length >= 2
      ? results
      : [
          ...history.slice(0, 2).map((h) => ({ ...h.destination, kind: 'recent' as const })),
          ...localPlaces,
        ];

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="search-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">{isStop ? 'Add a stop' : 'Set your destination'}</Text>
      </View>

      {/* trip endpoints */}
      <View style={styles.endpoints}>
        <View style={styles.epRow}>
          <View style={[styles.epDot, { backgroundColor: colors.jade }]} />
          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {pickup?.name ?? 'Current location'}
          </Text>
        </View>
        <View style={styles.epConnector} />
        <View style={styles.epRow}>
          <View style={[styles.epSquare, { backgroundColor: colors.ink }]} />
          <Input
            placeholder="Where to?"
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={{ height: 30 }}
          />
        </View>
      </View>

      <View style={styles.listHead}>
        <Eyebrow>{query.trim().length >= 2 ? 'Results' : 'Suggestions'}</Eyebrow>
        {loading ? <ActivityIndicator size="small" color={colors.jade} /> : null}
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={(item, i) => item.id + i}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.result}
            testID={`result-${item.id}`}
            onPress={() => choose(item)}
          >
            <View style={styles.resultIcon}>
              <Ionicons
                name={item.kind === 'recent' ? 'time-outline' : 'location-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="small" color={colors.textSecondary} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length >= 2 && !loading ? (
            <Text variant="body" color={colors.textSecondary} style={{ padding: space.lg }}>
              No matches. Try a street, place, or city.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  endpoints: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
  },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  epDot: { width: 12, height: 12, borderRadius: 6 },
  epSquare: { width: 12, height: 12, borderRadius: 3 },
  epConnector: {
    width: 2,
    height: 18,
    backgroundColor: colors.surfaceAlt,
    marginLeft: 5,
    marginVertical: 4,
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
