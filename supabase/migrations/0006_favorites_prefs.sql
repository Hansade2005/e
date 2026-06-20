-- ============================================================================
-- Ez2go — favorite drivers + ride preferences
-- Run after 0005. Safe to re-run.
-- ============================================================================

-- A rider's favorited drivers (by pool id or real driver uuid).
create table if not exists public.favorite_drivers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  driver_ref     text not null,
  driver_name    text,
  driver_vehicle text,
  avatar_color   text,
  created_at     timestamptz not null default now(),
  unique (user_id, driver_ref)
);
create index if not exists favorite_drivers_user_idx on public.favorite_drivers(user_id);

alter table public.favorite_drivers enable row level security;
drop policy if exists "fav owner" on public.favorite_drivers;
create policy "fav owner" on public.favorite_drivers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Comfort / accessibility preferences for a ride (comma-separated keys).
alter table public.rides add column if not exists ride_prefs text not null default '';
