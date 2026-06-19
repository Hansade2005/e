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
import { payments, type PaymentMethod } from '@/lib/payments';
import { formatMoney } from '@/constants/vehicles';
import { kmToMiles } from '@/lib/geo';
import { colors, radius, shadow, space, fonts } from '@/theme/tokens';

export default function SelectRide() {
  const insets = useSafeAreaInsets();
  const {
    pickup,
    destination,
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
  } = useRide();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [booking, setBooking] = useState(false);

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
          route={route}
        />
        <View style={[styles.back, { top: insets.top + space.sm }]}>
          <IconButton name="chevron-back" testID="select-back" onPress={() => router.back()} />
        </View>
        <View style={[styles.tripPill, { top: insets.top + space.sm }]}>
          <Text variant="label" color={colors.onInkMuted}>
            {kmToMiles(distanceKm).toFixed(1)} mi · {Math.round(durationMin)} min
          </Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
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
