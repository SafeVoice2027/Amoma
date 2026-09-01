-- =========================================================
-- Amoma — Handlers, Teacher Tagging & Role-Based Staff Views
-- File: supabase/migrations/0010_handlers_and_teacher_tags.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Splits the Staff role into two working modes without adding a new
-- top-level role: Handlers (Prefect of Discipline / CFLFO — case owners,
-- can update the Report Status checklist) and Teachers (subject-matter
-- staff — view-only on case progress, get tagged into specific reports by
-- Admin). `is_handler` is an Admin-toggleable flag rather than hardcoded to
-- specific people, since the real Handler accounts aren't identified yet.
-- =========================================================

alter table profiles add column is_handler boolean not null default false;
alter table profiles add column employee_number text unique;

-- Partial index: only Handler rows are ever looked up by this flag (staff
-- routing on login, notification fan-out), so indexing the common case
-- keeps the index small instead of indexing every profile's boolean.
create index idx_profiles_is_handler on profiles (is_handler) where is_handler;

-- Teachers authenticate with their Employee Number instead of a DepEd email.
-- Supabase Auth is still email-keyed underneath (same synthetic-identifier
-- pattern as student LRN login) — this resolves the number to the real
-- sign-in email so the client/server can complete a normal
-- signInWithPassword() call. SECURITY DEFINER + revoked from public because
-- it must run before the caller is authenticated (mirrors why
-- advance_report_stage() etc. are SECURITY DEFINER), but it only ever
-- returns an email string, never a password or profile id.
create or replace function get_login_email_by_employee_number(p_employee_number text)
returns text
language sql
security definer
set search_path = public
as $$
  select deped_email
  from profiles
  where employee_number = p_employee_number
    and role = 'staff'
  limit 1;
$$;

revoke all on function get_login_email_by_employee_number(text) from public;
grant execute on function get_login_email_by_employee_number(text) to anon, authenticated;

-- Admin-only, per-report "please look at this" tag directed at a specific
-- Teacher. Distinct from assigned_staff_id on `reports` (which tracks case
-- ownership) — a report can be tagged to any number of teachers without
-- reassigning it.
create table report_teacher_tags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  teacher_id uuid not null references profiles (id) on delete cascade,
  tagged_by uuid references profiles (id),
  note text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index idx_report_teacher_tags_teacher on report_teacher_tags (teacher_id);
create index idx_report_teacher_tags_report on report_teacher_tags (report_id);

alter table report_teacher_tags enable row level security;

create policy "Tagged teacher can view their own tags"
  on report_teacher_tags for select
  using (teacher_id = auth.uid());

create policy "Admin can view all teacher tags"
  on report_teacher_tags for select
  using (current_profile_role() = 'admin');

create policy "Only admin can create teacher tags"
  on report_teacher_tags for insert
  with check (current_profile_role() = 'admin');

create policy "Tagged teacher can update their own tag"
  on report_teacher_tags for update
  using (teacher_id = auth.uid());

-- Report Status checklist: only Handlers (not Teachers) and Admin may
-- advance/revert a case's stage. Replaces the old staff-wide policy.
drop policy "Assigned staff can update stage progress" on report_stage_progress;

create policy "Handlers and Admins can update stage progress"
  on report_stage_progress for update
  using (
    current_profile_role() = 'admin'
    or (
      current_profile_role() = 'staff'
      and exists (select 1 from profiles p where p.id = auth.uid() and p.is_handler)
      and exists (
        select 1 from reports r
        where r.id = report_stage_progress.report_id and r.assigned_staff_id = auth.uid()
      )
    )
  );

-- A Teacher tagged into a report can see its status even though they're
-- not "staff/admin" in the general sense the existing select policy covers
-- (that one already covers Handlers/Admin broadly; this adds the narrower
-- case of a Teacher tagged into one specific report).
create policy "Tagged teacher can view stage progress for their tagged report"
  on report_stage_progress for select
  using (
    exists (
      select 1 from report_teacher_tags t
      where t.report_id = report_stage_progress.report_id and t.teacher_id = auth.uid()
    )
  );

-- advance_report_stage() is SECURITY DEFINER and bypasses table RLS, so the
-- policy change above alone doesn't stop a Teacher from calling the RPC
-- directly — the permission check has to be duplicated inside the function
-- itself. Same body as supabase/migrations/0006_report_stage_progress.sql,
-- with the added is_handler check for staff callers.
create or replace function advance_report_stage(
  p_report_id uuid,
  p_direction text, -- 'advance' | 'revert'
  p_meeting_date date default null
)
returns report_stage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_role user_role;
  v_current report_stage;
  v_closed_at timestamptz;
  v_stages report_stage[] := array['case_filed', 'investigation', 'meeting', 'case_closed']::report_stage[];
  v_idx int;
begin
  v_caller_role := current_profile_role();
  if v_caller_role not in ('staff', 'admin') then
    raise exception 'Only staff or admin can update stage progress';
  end if;

  if v_caller_role = 'staff' and not exists (
    select 1 from profiles where id = v_caller and is_handler
  ) then
    raise exception 'Only Handlers can update stage progress';
  end if;

  select current_stage, case_closed_at into v_current, v_closed_at
  from report_stage_progress
  where report_id = p_report_id
  for update;

  if v_current is null then
    raise exception 'No stage progress row for report %', p_report_id;
  end if;

  v_idx := array_position(v_stages, v_current);

  if v_caller_role = 'staff' then
    update reports set assigned_staff_id = coalesce(assigned_staff_id, v_caller) where id = p_report_id;
  end if;

  if p_direction = 'advance' then
    if v_current = 'case_closed' then
      if v_closed_at is not null then
        raise exception 'Case is already closed';
      end if;
      update report_stage_progress
        set case_closed_at = now(), updated_by = v_caller
        where report_id = p_report_id;
      update reports set status = 'resolved' where id = p_report_id;
    else
      update report_stage_progress
        set
          current_stage = v_stages[v_idx + 1],
          case_filed_completed_at =
            case when v_current = 'case_filed' then now() else case_filed_completed_at end,
          investigation_completed_at =
            case when v_current = 'investigation' then now() else investigation_completed_at end,
          meeting_completed_at =
            case when v_current = 'meeting' then now() else meeting_completed_at end,
          meeting_tentative_date =
            case when v_current = 'meeting' then coalesce(p_meeting_date, meeting_tentative_date)
                 else meeting_tentative_date end,
          updated_by = v_caller
        where report_id = p_report_id;
    end if;
  elsif p_direction = 'revert' then
    if v_current = 'case_closed' and v_closed_at is not null then
      update report_stage_progress
        set case_closed_at = null, updated_by = v_caller
        where report_id = p_report_id;
      update reports set status = 'in_process' where id = p_report_id;
    else
      if v_idx <= 1 then
        raise exception 'Cannot revert past the first stage';
      end if;
      update report_stage_progress
        set
          current_stage = v_stages[v_idx - 1],
          case_filed_completed_at =
            case when v_stages[v_idx - 1] = 'case_filed' then null else case_filed_completed_at end,
          investigation_completed_at =
            case when v_stages[v_idx - 1] = 'investigation' then null else investigation_completed_at end,
          meeting_completed_at =
            case when v_stages[v_idx - 1] = 'meeting' then null else meeting_completed_at end,
          updated_by = v_caller
        where report_id = p_report_id;
    end if;
  else
    raise exception 'Invalid direction %', p_direction;
  end if;

  select current_stage into v_current from report_stage_progress where report_id = p_report_id;
  return v_current;
end;
$$;

-- =========================================================
-- End of migration
-- =========================================================
