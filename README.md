# Ez2go 🚗

A multi-featured **ride-sharing app** built with **React Native + Expo**, with
first-class **Expo Web** support so the full rider and driver journeys can be
launched and tested end-to-end in a browser (via Playwright). Maps are powered
entirely by **OpenStreetMap** — no API keys, no map billing.

> Design language: **"Kinetic Transit"** — a wayfinding / departure-board
> aesthetic. The recurring **route line** (jade origin → right-angle path →
> ink destination pin) is the signature motif; fares, ETAs and plates are set
> in monospace so data reads like a meter.

---

## Features

### Onboarding
- **Rider:** a short intro (how it works, fair pricing, location priming)
- **Driver:** multi-step setup (vehicle, license/insurance, payout) that gates
  going online and writes a `driver_profiles` row

### Live matching, chat & presence (poll-based, no Realtime)
- **Real matching:** a rider's request becomes a `rides` row (status `requested`);
  online drivers poll open requests, claim one (writing a driver summary), and
  both sides poll the row to follow status. Guests/offline use the local
  simulation unchanged. See `src/lib/rides.ts` + `supabase/migrations/0003_live_matching.sql`.
- **Chat** syncs against the matched ride (`messages` table) by polling; falls
  back to the scripted demo chat when there's no live ride.
- **Driver presence:** drivers upsert position to `driver_locations` while online;
  the rider map polls online drivers. Polling (not Realtime) keeps connection/
  credit costs down. See `src/lib/live.ts` + `supabase/migrations/0002_chat_presence.sql`.

### Rider
- **Onboarding hero** with the route-line signature and live stats
- **Email/password auth** (Supabase) + role picker + one-tap **guest demo**
- **Map home** on OpenStreetMap with live nearby cars and saved-place chips
- **Destination search** via OSM **Nominatim** geocoding (offline fallback)
- **Route drawing** via **OSRM** (L-shaped fallback when offline)
- **Vehicle classes** — Ez Go / Ez XL / Ez Premium — with live fare quotes
- **Driver gender preference** — request Any / Women / Men drivers; matching and
  open-request visibility honor it
- **Favorite drivers** — heart a driver after a ride; request favorites at booking
- **Ride preferences** — quiet ride, help with bags, wheelchair-accessible, pet
  on board; shown to the matched driver
- **Fare engine** (base + per-km + per-min + minimum + surge) and a
  "you save ~20% vs Uber/Lyft" comparison
- **Live trip tracking**: matching → driver en-route → arrived → in-progress,
  with an animated car moving along the route
- **Receipt + tip + rating**, Empower-style "driver keeps 100%" comparison
- **Ride history** persisted to Supabase (`rides`) so trips show across devices
- **Trip details + one-tap rebook** from any past trip
- **Schedule a ride** for later (the time pill on home)
- **Ez Wallet + promo codes** — apply codes (e.g. EZ10), credit auto-applies at checkout
- **AI ride assistant ("Ask Ez")** powered by the A0 LLM, with an offline fallback
- **Activity feed** with unread badge (ride, scheduled, and promo notifications)
- **In-app chat** (both rider↔driver), plus a **Safety toolkit** (share trip,
  emergency dialer, trusted contacts)
- **Saved places** — Home / Work / favorites stored in Supabase (`saved_places`)
- **Own Ez2go** — riders can buy into the platform too (community ownership):
  shares at $5, paid by card or Ez Wallet, with a running stake
- **Profile**, **payment methods**

### Driver
- **Go online/offline**, **incoming requests** (real open requests when matched,
  else simulated) with accept/decline
- **Trip stepper**: to pickup → arrived → start → complete; **rate the rider**
- **Safety selfie** required every 4 rides before going back online
- **Earnings dashboard**: weekly total, daily bar chart, instant cash-out
- **Invest in Ez2go**: at cash-out, drivers can put part of their earnings toward
  platform equity (shares + ownership %), tracked in `driver_investments`

### Platform
- **OpenStreetMap** maps via Leaflet on web (`react-leaflet`); native fallback
  is dependency-free and documents how to drop in `react-native-maps` + OSM tiles
- **AI** via the A0 LLM (`src/lib/ai.ts`) — the "Ask Ez" assistant; degrades to
  a helpful offline reply when the API is unreachable.
- **Pluggable payments** — the whole app talks to a `PaymentProvider` interface.
  Today it's `MockPaymentProvider`; swapping in **Stripe** is a one-line change
  in `src/lib/payments/index.ts` (see that file's notes)
- **Supabase** backend with a complete SQL migration + Row Level Security
- **Zustand** stores for auth, ride lifecycle, and driver state

---

## Getting started

```bash
npm install

# Run in the browser (Expo Web)
npm run web

# Run on a device / simulator
npm run start   # then press i / a, or scan the QR with Expo Go
```

### Configuration

Supabase credentials are read from `EXPO_PUBLIC_*` env vars, with safe public
defaults baked in so the app runs out of the box. To point at your own project,
create a `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

(The publishable/anon key is safe in the client — Row Level Security protects the data.)

### Database

Run the migration in the Supabase SQL editor (or `supabase db push`):

```
supabase/migrations/0001_init.sql
```

It creates `profiles`, `payment_methods`, `saved_places`, `rides`, with RLS,
an auto-profile trigger on sign-up, and realtime on `rides`.

### Seed demo data (optional)

```bash
npm run seed
```

Signs in a demo rider and seeds **saved places** (Home/Work/a favorite) and a
couple of completed **rides**. Set `SUPABASE_SERVICE_ROLE_KEY` to also create
demo **driver** accounts. Override `SEED_EMAIL` / `SEED_PASSWORD` as needed.
(Persistence is best-effort everywhere: signed-in users sync to Supabase; guest
and offline sessions stay fully local.)

---

## End-to-end testing (browser, Playwright)

```bash
npm run export:web      # build the static web bundle into dist/
npm run serve:web &     # serve it at http://localhost:8080
npm run e2e             # drive the full rider + driver journeys in Chromium
```

`e2e/flow.mjs` walks: guest sign-in → search → pick a ride → book → live
tracking → completion + tip + rating → switch to driver → go online → accept a
request → drive the trip → earnings. Screenshots are written to `e2e/*.png`.

---

## Project structure

```
app/                       # expo-router routes
  (auth)/                  # welcome hero, sign in / up
  (rider)/                 # home, search, select-ride, tracking, complete, history, profile, payment-methods
  (driver)/                # dashboard, trip, earnings
src/
  components/ui/           # design-system primitives (Button, Text, Card, Logo, …)
  components/Map/          # MapView.web (Leaflet/OSM) + native fallback
  constants/               # vehicle classes + fare engine, driver pool
  lib/                     # supabase, geo (Nominatim/OSRM), payments (mock + interface), storage
  lib/db.ts                # Supabase data access for rides + saved places
  store/                   # zustand: auth, ride, driver, places
  theme/                   # design tokens (color, type, spacing)
supabase/migrations/       # SQL schema
scripts/seed.mjs           # demo data seeder
```

---

## Swapping in Stripe later

1. Create `src/lib/payments/stripe.ts` implementing `PaymentProvider`
   (`@stripe/stripe-react-native` + a small server endpoint for PaymentIntents).
2. Change one line in `src/lib/payments/index.ts`:
   `export const payments = new StripeProvider();`

No screens change — they only ever import `payments` and the `PaymentProvider`
interface.
