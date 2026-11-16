-- =========================================================
-- Amoma — Student grade level, first-login prompt, grade on each report
-- File: supabase/migrations/0034_student_grade_and_first_login.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- 1. profiles.grade_level / profiles.section — set from the school's SF1
--    registers by the Developer's "Import students" page.
-- 2. profiles.must_choose_password — true for an account the school created
--    until the student has chosen their own password or decided to keep the
--    one the school gave them (the first-login prompt clears it).
-- 3. reports.grade_level — copied from the student's profile at the moment the
--    report is filed (a snapshot: when students move up a year, old reports
--    keep the grade they were filed under). Used only for aggregate stats —
--    it is never shown on an individual report page.
-- =========================================================

alter table profiles
  add column if not exists grade_level smallint,
  add column if not exists section text,
  add column if not exists must_choose_password boolean not null default false;

alter table reports add column if not exists grade_level smallint;

create or replace function snapshot_report_grade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select grade_level into new.grade_level from profiles where id = new.reporter_id;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_report_grade on reports;
create trigger trg_snapshot_report_grade
  before insert on reports
  for each row execute function snapshot_report_grade();

-- Reports filed before this migration get their reporter's grade when the
-- Import students page updates that student; until a student's grade is known
-- the report simply has none.

-- =========================================================
-- End of migration
-- =========================================================
