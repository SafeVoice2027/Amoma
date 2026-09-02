-- =========================================================
-- Amoma — Student Roster (auto-approve signup by LRN)
-- File: supabase/migrations/0011_student_roster.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Holds the school's known-valid LRNs (imported from the school's own
-- records) so a student signup can be auto-approved when their LRN is on
-- the list, instead of always sitting in the pending queue for Admin to
-- check by hand. Written and read only by server-side code (service role
-- during signup, Admin-only if a management screen is ever built) — never
-- exposed to a student's own session.
-- =========================================================

create table student_roster (
  lrn text primary key,
  grade_section text,
  school_id uuid references schools (id),
  created_at timestamptz not null default now()
);

alter table student_roster enable row level security;

create policy "Only Admin can view the student roster"
  on student_roster for select
  using (current_profile_role() = 'admin');

-- No insert/update/delete policy — the roster is only ever written by
-- service-role code (initial import, and any future Admin-facing upload
-- tool), same as identity_disclosure_log.

-- =========================================================
-- End of migration
-- =========================================================
