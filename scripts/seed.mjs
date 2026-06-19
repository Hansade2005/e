#!/usr/bin/env node
/**
 * Ez2go — tiny demo seed.
 *
 * Seeds a demo rider with saved places (Home / Work / a favorite) and a couple
 * of completed rides, so "trips show across devices" has something to show.
 * Optionally creates demo DRIVER profiles when a service-role key is provided
 * (driver profiles need real auth users, which only the admin API can mint).
 *
 * Usage:
 *   node scripts/seed.mjs
 *
 * Env (all optional — sensible defaults baked in):
 *   SUPABASE_URL                 default: project URL
 *   SUPABASE_ANON_KEY            default: publishable key
 *   SEED_EMAIL / SEED_PASSWORD   the demo rider to sign in/up as
 *   SUPABASE_SERVICE_ROLE_KEY    if set, also seeds demo driver accounts
 *
 * Prereq: run supabase/migrations/0001_init.sql first.
 */
import { createClient } from '@supabase/supabase-js';

const URL =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://xgekhomwstiqjjazvpgy.supabase.co';
const ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_uS2VcJwLbqWkYUDUY5Emxg_bW24INwm';

const EMAIL = process.env.SEED_EMAIL || 'demo.rider@ez2go.app';
const PASSWORD = process.env.SEED_PASSWORD || 'ez2go-demo-123';

const SAVED_PLACES = [
  { kind: 'home', name: 'Home', address: '1316 Lydia Ave, Kansas City, MO', lat: 39.0997, lng: -94.5731 },
  { kind: 'work', name: 'Work — Power & Light', address: '1357 Grand Blvd, Kansas City, MO', lat: 39.0976, lng: -94.5829 },
  { kind: 'favorite', name: 'City Market', address: '20 E 5th St, Kansas City, MO', lat: 39.1093, lng: -94.5829 },
];

const RIDES = [
  {
    vehicle_class: 'ezgo',
    pickup_name: 'Home', pickup_lat: 39.0997, pickup_lng: -94.5731,
    dest_name: 'Union Station', dest_lat: 39.0844, dest_lng: -94.5853,
    distance_km: 3.1, duration_min: 9, fare: 8.4, tip: 2, rider_rating: 5,
  },
  {
    vehicle_class: 'ezpremium',
    pickup_name: 'Power & Light District', pickup_lat: 39.0976, pickup_lng: -94.5829,
    dest_name: 'Kansas City Intl (MCI)', dest_lat: 39.2976, dest_lng: -94.7139,
    distance_km: 29.4, duration_min: 28, fare: 61.2, tip: 8, rider_rating: 5,
  },
];

const DEMO_DRIVERS = [
  { email: 'marcus.driver@ez2go.app', name: 'Marcus Bell' },
  { email: 'aaliyah.driver@ez2go.app', name: 'Aaliyah Reed' },
];

async function main() {
  console.log(`→ Supabase: ${URL}`);
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });

  // 1) ensure the demo rider exists + is signed in
  await sb.auth.signUp({ email: EMAIL, password: PASSWORD, options: { data: { name: 'Demo Rider', role: 'rider' } } }).catch(() => {});
  const { data: signIn, error: signInErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signInErr || !signIn.user) {
    console.error('✗ Could not sign in the demo rider.');
    console.error('  If email confirmation is ON for this project, confirm the user once, then re-run.');
    console.error('  Detail:', signInErr?.message);
    process.exit(1);
  }
  const userId = signIn.user.id;
  console.log(`✓ Signed in demo rider (${EMAIL})`);

  // 2) saved places (idempotent: clear this user's rows first)
  await sb.from('saved_places').delete().eq('user_id', userId);
  const { error: spErr } = await sb
    .from('saved_places')
    .insert(SAVED_PLACES.map((p) => ({ ...p, user_id: userId })));
  console.log(spErr ? `✗ saved_places: ${spErr.message}` : `✓ Seeded ${SAVED_PLACES.length} saved places`);

  // 3) ride history
  const now = Date.now();
  const { error: rErr } = await sb.from('rides').insert(
    RIDES.map((r, i) => ({
      ...r,
      rider_id: userId,
      status: 'completed',
      currency: 'USD',
      payment_status: 'paid',
      requested_at: new Date(now - (i + 1) * 86400000).toISOString(),
      completed_at: new Date(now - (i + 1) * 86400000 + 1500000).toISOString(),
    })),
  );
  console.log(rErr ? `✗ rides: ${rErr.message}` : `✓ Seeded ${RIDES.length} completed rides`);

  // 4) optional: demo driver profiles (requires service role)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(URL, serviceKey, { auth: { persistSession: false } });
    for (const d of DEMO_DRIVERS) {
      const { data, error } = await admin.auth.admin.createUser({
        email: d.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { name: d.name, role: 'driver' },
      });
      if (error && !/registered/i.test(error.message)) {
        console.log(`✗ driver ${d.name}: ${error.message}`);
        continue;
      }
      const id = data?.user?.id;
      if (id) {
        await admin.from('profiles').upsert(
          { id, email: d.email, full_name: d.name, role: 'driver', rating: 4.95, trips: 4200 },
          { onConflict: 'id' },
        );
      }
      console.log(`✓ Demo driver ready: ${d.name}`);
    }
  } else {
    console.log('• Skipped demo drivers (set SUPABASE_SERVICE_ROLE_KEY to seed them).');
  }

  console.log('\nDone. Sign in as the demo rider to see seeded places + trips.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
