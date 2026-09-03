-- =========================================================
-- Amoma — Staff Roster (auto-approve Handler signup by Employee Number)
-- File: supabase/migrations/0013_staff_roster.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Mirrors student_roster (supabase/migrations/0011_student_roster.sql), but
-- for staff: a known-valid Employee Number lets a Handler's signup
-- auto-approve (and grants is_handler) instead of sitting in the pending
-- queue. This is a NEW signup path — until now, Employee Number was only
-- ever assigned by an Admin to an already-approved Teacher account
-- (supabase/migrations/0010_handlers_and_teacher_tags.sql); a Handler
-- signing up this way has no DepEd email at all, only a synthetic one (see
-- emailForSignup() in app/(auth)/signup/actions.ts).
-- =========================================================

create table staff_roster (
  employee_number text primary key,
  full_name text,
  school_id uuid references schools (id),
  created_at timestamptz not null default now()
);

alter table staff_roster enable row level security;

create policy "Only Admin can view the staff roster"
  on staff_roster for select
  using (current_profile_role() = 'admin');

-- No insert/update/delete policy — written only by service-role code
-- (initial import, and any future Admin-facing upload tool), same as
-- student_roster and identity_disclosure_log.

-- A Handler who signs up via Employee Number has no DepEd email — their
-- Supabase Auth email is the synthetic one, stored in deped_email is left
-- null. COALESCE falls back to the synthetic address in that case, and
-- keeps returning the real DepEd email unchanged for a Teacher whose
-- Employee Number was assigned by an Admin after the fact.
create or replace function get_login_email_by_employee_number(p_employee_number text)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(deped_email, employee_number || '@employee.safevoice.internal')
  from profiles
  where employee_number = p_employee_number
    and role = 'staff'
  limit 1;
$$;

revoke all on function get_login_email_by_employee_number(text) from public;
grant execute on function get_login_email_by_employee_number(text) to anon, authenticated;

-- =========================================================
-- End of migration
-- =========================================================
