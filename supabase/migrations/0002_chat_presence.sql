-- ============================================================================
-- Ez2go — chat + driver presence (poll-based, no Realtime channels)
-- Run after 0001_init.sql. Safe to re-run.
--
-- Clients POLL these tables on an interval (see src/lib/live.ts) rather than
-- subscribing to Realtime, to avoid persistent connection / credit costs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- driver_profiles : vehicle + verification details captured at driver onboarding
-- ----------------------------------------------------------------------------
create table if not exists public.driver_profiles (
  id                 uuid primary key references public.profiles(id) on delete cascade,
  vehicle_make       text,
  vehicle_model      text,
  vehicle_year       smallint,
  vehicle_color      text,
  plate              text,
  license_no         text,
  insurance_provider text,
  payout_method      text,
  verified           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists trg_driver_profiles_updated on public.driver_profiles;
create trigger trg_driver_profiles_updated
  before update on public.driver_profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- messages : per-ride chat between rider and driver
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  ride_id     uuid references public.rides(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,             -- 'rider' | 'driver'
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_ride_idx on public.messages(ride_id, created_at);

-- ----------------------------------------------------------------------------
-- driver_locations : last-known position + online flag (one row per driver).
-- Riders poll this to see who is live nearby; drivers upsert on an interval.
-- ----------------------------------------------------------------------------
create table if not exists public.driver_locations (
  id         uuid primary key references public.profiles(id) on delete cascade,
  lat        double precision,
  lng        double precision,
  heading    double precision,
  is_online  boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists driver_locations_online_idx on public.driver_locations(is_online, updated_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.driver_profiles  enable row level security;
alter table public.messages         enable row level security;
alter table public.driver_locations enable row level security;

-- driver_profiles: strictly owner-only (contains license / insurance PII)
drop policy if exists "dp owner" on public.driver_profiles;
create policy "dp owner" on public.driver_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- messages: visible to the ride's participants (or the sender); only the sender
-- can post, and only into a ride they belong to.
drop policy if exists "messages read"   on public.messages;
drop policy if exists "messages insert" on public.messages;
create policy "messages read" on public.messages
  for select using (
    sender_id = auth.uid()
    or (ride_id is not null and exists (
      select 1 from public.rides r
      where r.id = messages.ride_id
        and (r.rider_id = auth.uid() or r.driver_id = auth.uid())
    ))
  );
create policy "messages insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (ride_id is null or exists (
      select 1 from public.rides r
      where r.id = messages.ride_id
        and (r.rider_id = auth.uid() or r.driver_id = auth.uid())
    ))
  );

-- driver_locations: a driver manages their own row; anyone authenticated can
-- read drivers that are currently online (for presence on the rider map).
drop policy if exists "loc owner"       on public.driver_locations;
drop policy if exists "loc read online" on public.driver_locations;
create policy "loc owner" on public.driver_locations
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "loc read online" on public.driver_locations
  for select using (is_online = true or auth.uid() = id);
