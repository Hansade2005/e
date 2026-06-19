import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { usePlaces } from '@/store/places';
import { searchPlaces, type Place } from '@/lib/geo';
import { colors, radius, space } from '@/theme/tokens';

type EditKind = 'home' | 'work' | 'favorite';

export default function SavedPlaces() {
  const insets = useSafeAreaInsets();
  const { places, load, byKind, setPlace, addFavorite, remove } = usePlaces();

  const [editing, setEditing] = useState<EditKind | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    if (timer.current) clearTimeout(timer.current);
    if (!editing || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await searchPlaces(query);
      if (!active) return;
      setResults(r);
      setLoading(false);
    }, 350);
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, editing]);

  async function choose(place: Place) {
    if (editing === 'favorite') await addFavorite(place);
    else if (editing) await setPlace(editing, place);
    setEditing(null);
    setQuery('');
    setResults([]);
  }

  const home = byKind('home');
  const work = byKind('work');
  const favorites = places.filter((p) => p.kind === 'favorite');

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="places-back">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text variant="h3">Saved places</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxl }}>
        {editing ? (
          <View style={styles.searchPane}>
            <View style={styles.searchHead}>
              <Eyebrow>
                {editing === 'home' ? 'Set home' : editing === 'work' ? 'Set work' : 'Add a favorite'}
              </Eyebrow>
              <Pressable onPress={() => { setEditing(null); setQuery(''); }} testID="cancel-edit">
                <Text variant="smallStrong" color={colors.textSecondary}>
                  Cancel
                </Text>
              </Pressable>
            </View>
            <Input
              placeholder="Search an address or place"
              testID="places-search-input"
              value={query}
              onChangeText={setQuery}
              autoFocus
              icon={<Ionicons name="search" size={18} color={colors.textSecondary} />}
            />
            {loading ? <ActivityIndicator color={colors.jade} style={{ marginTop: space.md }} /> : null}
            {results.map((r) => (
              <Pressable key={r.id} style={styles.result} testID={`place-result-${r.id}`} onPress={() => choose(r)}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>{r.name}</Text>
                  <Text variant="small" color={colors.textSecondary} numberOfLines={1}>{r.address}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <Eyebrow>Quick destinations</Eyebrow>
            <SlotRow
              icon="home"
              title="Home"
              place={home}
              onSet={() => setEditing('home')}
              onClear={home ? () => remove(home.id) : undefined}
              testID="slot-home"
            />
            <SlotRow
              icon="briefcase"
              title="Work"
              place={work}
              onSet={() => setEditing('work')}
              onClear={work ? () => remove(work.id) : undefined}
              testID="slot-work"
            />

            <View style={{ height: space.lg }} />
            <Eyebrow>Favorites</Eyebrow>
            {favorites.map((f) => (
              <SlotRow
                key={f.id}
                icon="star"
                title={f.name}
                place={f}
                hideTitle
                onClear={() => remove(f.id)}
                testID={`fav-${f.id}`}
              />
            ))}
            <Pressable style={styles.addFav} testID="add-favorite" onPress={() => setEditing('favorite')}>
              <Ionicons name="add" size={20} color={colors.jade} />
              <Text variant="bodyStrong" color={colors.jade}>
                Add a favorite
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SlotRow({
  icon,
  title,
  place,
  onSet,
  onClear,
  hideTitle,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  place?: { name: string; address: string };
  onSet?: () => void;
  onClear?: () => void;
  hideTitle?: boolean;
  testID?: string;
}) {
  return (
    <Pressable style={styles.slot} onPress={onSet} testID={testID} disabled={!onSet}>
      <View style={styles.slotIcon}>
        <Ionicons name={icon} size={18} color={colors.jade} />
      </View>
      <View style={{ flex: 1 }}>
        {!hideTitle ? <Text variant="bodyStrong">{title}</Text> : null}
        <Text variant={hideTitle ? 'bodyStrong' : 'small'} color={hideTitle ? colors.textPrimary : colors.textSecondary} numberOfLines={1}>
          {place ? (hideTitle ? title : place.name) : 'Not set — tap to add'}
        </Text>
        {place && hideTitle ? (
          <Text variant="small" color={colors.textSecondary} numberOfLines={1}>{place.address}</Text>
        ) : null}
      </View>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8} testID={`clear-${testID}`}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
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
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  slotIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.jadeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.jade,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  searchPane: { gap: space.sm },
  searchHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
  },
});
