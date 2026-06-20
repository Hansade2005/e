-- ============================================================================
-- Ez2go — driver gender + rider gender preference
-- Run after 0004. Safe to re-run.
-- ============================================================================

-- Driver's gender (captured at onboarding) so requests can be matched.
alter table public.driver_profiles add column if not exists gender text;

-- The rider's preferred driver gender for a ride: 'any' | 'female' | 'male'.
alter table public.rides add column if not exists driver_gender_pref text not null default 'any';
