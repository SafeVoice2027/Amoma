-- =========================================================
-- Amoma — Unread reports (red dot) for Admins and the Developer
-- File: supabase/migrations/0031_report_unread_tracking.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- A report is "unread" for a viewer until they open it. Each viewer is tracked
-- separately (the Developer and each Admin have their own red dots):
--   - report_reads: one row per (viewer, report) once they've opened it.
--   - profiles.unread_since: only reports filed AFTER this moment can show as
--     unread for that account. Existing accounts get "now" when this runs, so
--     the reports already in the system start out read; a new account gets its
--     own creation time.
-- =========================================================

alter table profiles add column if not exists unread_since timestamptz not null default now();

create table if not exists report_reads (
  profile_id uuid not null references profiles (id) on delete cascade,
  report_id uuid not null references reports (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (profile_id, report_id)
);

alter table report_reads enable row level security;

drop policy if exists "Users manage their own report reads" on report_reads;
create policy "Users manage their own report reads"
  on report_reads for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant select, insert, update on report_reads to authenticated;

-- =========================================================
-- End of migration
-- =========================================================
