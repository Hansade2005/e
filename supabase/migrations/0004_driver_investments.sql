-- ============================================================================
-- Ez2go — driver investments
-- Lets a driver buy equity in the platform when cashing out. One row per driver.
-- Run after 0003. Safe to re-run.
-- ============================================================================

create table if not exists public.driver_investments (
  id             uuid primary key references public.profiles(id) on delete cascade,
  total_invested numeric(12,2) not null default 0,
  shares         numeric(12,4) not null default 0,
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_driver_investments_updated on public.driver_investments;
create trigger trg_driver_investments_updated
  before update on public.driver_investments
  for each row execute function public.set_updated_at();

alter table public.driver_investments enable row level security;

drop policy if exists "inv owner" on public.driver_investments;
create policy "inv owner" on public.driver_investments
  for all using (auth.uid() = id) with check (auth.uid() = id);
