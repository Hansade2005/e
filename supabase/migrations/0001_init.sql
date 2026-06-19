-- ============================================================================
-- Ez2go — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type ez_role as enum ('rider', 'driver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ez_ride_status as enum (
    'requested','searching','arriving','arrived','in_progress','completed','cancelled'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles : one row per auth user
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  phone        text,
  role         ez_role not null default 'rider',
  rating       numeric(3,2) not null default 5.00,
  trips        integer not null default 0,
  avatar_color text default '#00C2A8',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- payment_methods : tokenized cards / wallets (no raw PAN ever stored)
-- ============================================================================
create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  brand       text not null,            -- visa | mastercard | amex | cash | wallet
  label       text not null,            -- "Visa •••• 4242"
  last4       text,
  exp_month   smallint,
  exp_year    smallint,
  provider    text not null default 'mock',  -- swap to 'stripe' later
  provider_id text,                      -- e.g. Stripe payment_method id
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on public.payment_methods(user_id);

-- ============================================================================
-- saved_places : home / work / favorites
-- ============================================================================
create table if not exists public.saved_places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'favorite',  -- home | work | favorite
  name       text not null,
  address    text,
  lat        double precision not null,
  lng        double precision not null,
  created_at timestamptz not null default now()
);
create index if not exists saved_places_user_idx on public.saved_places(user_id);

-- ============================================================================
-- rides : the trip ledger
-- ============================================================================
create table if not exists public.rides (
  id              uuid primary key default gen_random_uuid(),
  rider_id        uuid references public.profiles(id) on delete set null,
  driver_id       uuid references public.profiles(id) on delete set null,
  status          ez_ride_status not null default 'requested',
  vehicle_class   text not null,
  pickup_name     text,
  pickup_lat      double precision not null,
  pickup_lng      double precision not null,
  dest_name       text,
  dest_lat        double precision not null,
  dest_lng        double precision not null,
  distance_km     numeric(8,2),
  duration_min    numeric(8,2),
  fare            numeric(10,2),
  tip             numeric(10,2) default 0,
  currency        text not null default 'USD',
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  payment_status  text not null default 'pending', -- pending | paid | failed
  rider_rating    smallint,
  driver_rating   smallint,
  requested_at    timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists rides_rider_idx  on public.rides(rider_id);
create index if not exists rides_driver_idx on public.rides(driver_id);

-- ============================================================================
-- updated_at trigger for profiles
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create a profile row when a new auth user signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::ez_role, 'rider')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.payment_methods enable row level security;
alter table public.saved_places    enable row level security;
alter table public.rides           enable row level security;

-- profiles: a user manages their own row; everyone can read basic profiles
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles write"  on public.profiles;
create policy "profiles read"  on public.profiles for select using (true);
create policy "profiles write" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- payment_methods: strictly owner-only
drop policy if exists "pm owner" on public.payment_methods;
create policy "pm owner" on public.payment_methods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_places: strictly owner-only
drop policy if exists "places owner" on public.saved_places;
create policy "places owner" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- rides: visible to the rider or the assigned driver; rider creates; both update
drop policy if exists "rides read"   on public.rides;
drop policy if exists "rides insert" on public.rides;
drop policy if exists "rides update" on public.rides;
create policy "rides read" on public.rides
  for select using (auth.uid() = rider_id or auth.uid() = driver_id);
create policy "rides insert" on public.rides
  for insert with check (auth.uid() = rider_id);
create policy "rides update" on public.rides
  for update using (auth.uid() = rider_id or auth.uid() = driver_id);

-- ============================================================================
-- Realtime (drivers watch for new requests, riders watch their ride)
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.rides;
exception when duplicate_object then null; end $$;
