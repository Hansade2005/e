import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapView } from '@/components/Map';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useRide } from '@/store/ride';
import { useFavorites } from '@/store/favorites';
import { GENDER_PREFS } from '@/constants/drivers';
import { RIDE_PREFS } from '@/constants/preferences';
import { payments, type PaymentMethod } from '@/lib/payments';
import { formatMoney } from '@/constants/vehicles';
import { formatDistance } from '@/lib/geo';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';

export default function SelectRide() {
  const insets = useSafeAreaInsets();
  const {
    pickup,
    destination,
    stops,
    removeStop,
    route,
    quotes,
    selectedVehicleId,
    selectVehicle,
    distanceKm,
    durationMin,
    methodId,
    setMethod,
    requestRide,
    scheduledAt,
    scheduleRide,
    driverGenderPref,
    setDriverGenderPref,
    preferFavorite,
    setPreferFavorite,
    ridePrefs,
    toggleRidePref,
  } = useRide();

  const favorites = useFavorites((s) => s.favorites);
  const loadFavorites = useFavorites((s) => s.load);
  const units = useSettings((s) => s.units);
  const loadSettings = useSettings((s) => s.load);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadFavorites();
    loadSettings();
  }, [loadFavorites, loadSettings]);

  useEffect(() => {
    payments.listMethods().then(setMethods);
  }, []);

  useEffect(() => {
    // keep selected method valid
    if (methods.length && !methods.some((m) => m.id === methodId)) {
      const def = methods.find((m) => m.isDefault) ?? methods[0];
      setMethod(def.id);
    }
  }, [methods]);

  if (!destination) {
    router.replace('/(rider)/home');
    return null;
  }

  const selected = quotes.find((q) => q.vehicle.id === selectedVehicleId) ?? quotes[0];
  const method = methods.find((m) => m.id === methodId) ?? methods[0];
  // Empower-style comparison: rough "what Uber/Lyft would charge" (+22%).
  const rivalFare = selected ? selected.fare.total * 1.22 : 0;

  async function book() {
    setBooking(true);
    if (scheduledAt) {
      await scheduleRide();
      if (router.canDismiss()) router.dismissAll();
      else router.replace('/(rider)/home');
      return;
    }
    await requestRide();
    router.push('/(rider)/tracking');
  }

  return (
    <View style={styles.fill}>
      <View style={styles.mapWrap}>
        <MapView
          center={pickup ?? undefined}
          pickup={pickup}
          destination={destination}
          stops={stops}
          route={route}
        />
        <View style={[styles.back, { top: insets.top + space.sm }]}>
          <IconButton name="chevron-back" testID="select-back" onPress={() => router.back()} />
        </View>
        <View style={[styles.tripPill, { top: insets.top + space.sm }]}>
          <Text variant="label" color={colors.onInkMuted}>
            {formatDistance(distanceKm, units)} · {Math.round(durationMin)} min
          </Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
          {/* Route with optional stops */}
          <View style={styles.routeCard}>
            <View style={styles.routeLine}>
              <View style={[styles.rDot, { backgroundColor: colors.jade }]} />
              <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>{pickup?.name}</Text>
            </View>
            {stops.map((s, i) => (
              <View key={`${s.id}-${i}`} style={styles.routeLine} testID={`stop-${i}`}>
                <View style={[styles.rDot, { backgroundColor: colors.amber }]} />
                <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>{s.name}</Text>
                <Pressable onPress={() => removeStop(i)} hitSlop={8} testID={`remove-stop-${i}`}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <View style={styles.routeLine}>
              <View style={[styles.rSquare, { backgroundColor: colors.ink }]} />
              <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>{destination?.name}</Text>
            </View>
            {stops.length < 3 ? (
              <Pressable
                style={styles.addStop}
                testID="add-stop"
                onPress={() => router.push({ pathname: '/(rider)/search', params: { mode: 'stop' } })}
              >
                <Ionicons name="add" size={16} color={colors.jade} />
                <Text variant="smallStrong" color={colors.jade}>Add a stop</Text>
              </Pressable>
            ) : null}
          </View>

          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: space.sm }}>
            Choose your ride
          </Text>
          {quotes.map(({ vehicle, fare }) => {
            const active = vehicle.id === selectedVehicleId;
            return (
              <Pressable
                key={vehicle.id}
                testID={`vehicle-${vehicle.id}`}
                onPress={() => selectVehicle(vehicle.id)}
                style={[styles.vehicle, active && styles.vehicleActive]}
              >
                <View style={[styles.vehIcon, active && { backgroundColor: colors.jadeSoft }]}>
                  <Text style={{ fontSize: 26 }}>{vehicle.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.vehTitleRow}>
                    <Text variant="bodyStrong">{vehicle.name}</Text>
                    <View style={styles.seats}>
                      <Ionicons name="person" size={11} color={colors.textMuted} />
                      <Text variant="label" color={colors.textMuted}>
                        {vehicle.seats}
                      </Text>
                    </View>
                  </View>
                  <Text variant="small" color={colors.textSecondary} numberOfLines={1}>
                    {vehicle.tagline} · {vehicle.etaMin} min away
                  </Text>
                </View>
                <Text style={styles.fare}>{formatMoney(fare.total)}</Text>
              </Pressable>
            );
          })}

          <View style={styles.savings}>
            <Ionicons name="trending-down" size={16} color={colors.jade} />
            <Text variant="smallStrong" color={colors.jadeDark}>
              {formatMoney(selected.fare.total)} vs ~{formatMoney(rivalFare)} on Uber/Lyft — you
              save {formatMoney(rivalFare - selected.fare.total)}
            </Text>
          </View>

          {/* Driver gender preference */}
          <Text variant="label" color={colors.textSecondary} style={{ marginTop: space.lg, marginBottom: space.sm }}>
            Driver preference
          </Text>
          <View style={styles.prefRow}>
            {GENDER_PREFS.map((p) => {
              const active = p.id === driverGenderPref;
              return (
                <Pressable
                  key={p.id}
                  testID={`gender-pref-${p.id}`}
                  onPress={() => setDriverGenderPref(p.id)}
                  style={[styles.pref, active && styles.prefActive]}
                >
                  <Ionicons name={p.icon as any} size={16} color={active ? colors.jadeDark : colors.textSecondary} />
                  <Text variant="smallStrong" color={active ? colors.jadeDark : colors.textSecondary}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Favorite driver */}
          {favorites.length ? (
            <Pressable
              testID="prefer-favorite"
              onPress={() => setPreferFavorite(!preferFavorite)}
              style={[styles.favRow, preferFavorite && styles.favRowActive]}
            >
              <Ionicons
                name={preferFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={preferFavorite ? colors.amber : colors.textSecondary}
              />
              <Text variant="smallStrong" color={preferFavorite ? colors.ink : colors.textSecondary} style={{ flex: 1 }}>
                Favorite driver
              </Text>
              <Text variant="label" color={colors.textMuted}>
                {favorites.length} saved
              </Text>
            </Pressable>
          ) : null}

          {/* Ride preferences */}
          <Text variant="label" color={colors.textSecondary} style={{ marginTop: space.lg, marginBottom: space.sm }}>
            Preferences
          </Text>
          <View style={styles.prefChips}>
            {RIDE_PREFS.map((p) => {
              const active = ridePrefs.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  testID={`ride-pref-${p.id}`}
                  onPress={() => toggleRidePref(p.id)}
                  style={[styles.prefChip, active && styles.prefChipActive]}
                >
                  <Ionicons name={p.icon} size={14} color={active ? colors.jadeDark : colors.textSecondary} />
                  <Text variant="smallStrong" color={active ? colors.jadeDark : colors.textSecondary}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* payment method */}
        <Pressable
          style={styles.payRow}
          testID="payment-row"
          onPress={() => router.push('/(rider)/payment-methods')}
        >
          <Ionicons
            name={method?.brand === 'cash' ? 'cash-outline' : 'card-outline'}
            size={20}
            color={colors.ink}
          />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {method?.label ?? 'Add payment'}
          </Text>
          <Text variant="smallStrong" color={colors.jade}>
            Change
          </Text>
        </Pressable>

        {scheduledAt ? (
          <View style={styles.schedRow}>
            <Ionicons name="time" size={15} color={colors.jade} />
            <Text variant="smallStrong" color={colors.jadeDark}>
              Scheduled for{' '}
              {new Date(scheduledAt).toLocaleString(undefined, {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ) : null}

        <Button
          label={
            scheduledAt
              ? `Schedule ${selected.vehicle.name} · ${formatMoney(selected.fare.total)}`
              : `Book ${selected.vehicle.name} · ${formatMoney(selected.fare.total)}`
          }
          variant="primary"
          testID="book-ride"
          loading={booking}
          onPress={book}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  mapWrap: { flex: 1 },
  back: { position: 'absolute', left: space.lg },
  tripPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    paddingHorizontal: space.lg,
    height: 36,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    ...shadow.sheet,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    marginBottom: space.md,
  },
  routeCard: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    gap: 8,
  },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rDot: { width: 9, height: 9, borderRadius: 5 },
  rSquare: { width: 9, height: 9, borderRadius: 2 },
  addStop: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: space.xs,
  },
  vehicleActive: { borderColor: colors.jade, backgroundColor: colors.jadeSoft },
  vehIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seats: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fare: { fontFamily: fonts.monoBold, fontSize: 17, color: colors.ink },
  prefRow: { flexDirection: 'row', gap: space.sm },
  pref: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
  },
  prefActive: { borderColor: colors.jade, backgroundColor: colors.jadeSoft },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    height: 50,
    marginTop: space.md,
  },
  favRowActive: { borderColor: colors.amber, backgroundColor: colors.amberSoft },
  prefChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  prefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    height: 38,
  },
  prefChipActive: { borderColor: colors.jade, backgroundColor: colors.jadeSoft },
  savings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.jadeSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    marginVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: space.sm,
  },
});
