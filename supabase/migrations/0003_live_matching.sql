-- ============================================================================
-- Ez2go — live matching (poll-based)
-- Run after 0002. Lets a rider's request become visible to online drivers, lets
-- a driver claim it, and carries a small denormalized driver summary so the
-- rider can show who's coming without reading the driver's private profile.
-- ============================================================================

alter table public.rides add column if not exists driver_name    text;
alter table public.rides add column if not exists driver_vehicle text;
alter table public.rides add column if not exists driver_plate   text;

-- Fast lookup of unclaimed requests.
create index if not exists rides_open_idx on public.rides(status) where driver_id is null;

-- A driver may SEE open requests (status 'requested', not yet claimed).
drop policy if exists "rides read open" on public.rides;
create policy "rides read open" on public.rides
  for select using (
    status = 'requested'
    and driver_id is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
  );

-- A driver may CLAIM an open request (assign themselves). Once claimed, further
-- updates fall under the existing "rides update" policy (driver_id = auth.uid()).
drop policy if exists "rides claim" on public.rides;
create policy "rides claim" on public.rides
  for update using (
    status = 'requested'
    and driver_id is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
  )
  with check (driver_id = auth.uid());
