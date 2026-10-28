-- =========================================================
-- Amoma — Admin positions: only the Learner Formation Officer tags teachers
-- File: supabase/migrations/0026_admin_position_lfo_tags.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Cases are viewed by the Developer and by the two Admin positions — the
-- Learner Formation Officer (LFO) and the School Head — but only the LFO
-- assigns (tags) a teacher to a case. Admin = a staff profile with
-- is_handler = true (0010); `admin_position` says which of the two it is.
--
-- Existing Admins are backfilled as LFO so nobody loses the ability to tag
-- the moment this runs; the Developer can switch an account to School Head
-- on the Accounts screen.
-- =========================================================

do $$
begin
  create type admin_position as enum ('learner_formation_officer', 'school_head');
exception
  when duplicate_object then null;
end
$$;

alter table profiles add column if not exists admin_position admin_position;

update profiles
set admin_position = 'learner_formation_officer'
where role = 'staff' and is_handler and admin_position is null;

drop policy if exists "Handler can create teacher tags" on report_teacher_tags;
drop policy if exists "Learner Formation Officer can create teacher tags" on report_teacher_tags;
create policy "Learner Formation Officer can create teacher tags"
  on report_teacher_tags for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and is_handler
        and admin_position = 'learner_formation_officer'
    )
  );

-- =========================================================
-- End of migration
-- =========================================================
