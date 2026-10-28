-- =========================================================
-- Amoma — Case flow becomes three steps
-- File: supabase/migrations/0029_three_step_case_flow.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- The Report Status tracker / case checklist is now
--   Case Assessment -> Ongoing Action -> Case Closed
-- (was Case Assessment -> Scheduling -> Investigation & Counseling -> Case
-- Closed; see 0012). Same approach as 0012: the enum members are unchanged.
-- 'investigation' is the enum value used for "Ongoing Action"; 'meeting'
-- (the old Scheduling step) is no longer reachable. Reports currently sitting
-- at Scheduling move to Ongoing Action — they were already past assessment.
--
-- The checklist works exactly as before: any permitted caller (tagged
-- Teacher, Admin, Developer) can advance or revert it; a plain Teacher must be
-- tagged into the report first (0024).
-- =========================================================

update report_stage_progress
set current_stage = 'investigation',
    case_filed_completed_at = coalesce(case_filed_completed_at, now())
where current_stage = 'meeting';

create or replace function advance_report_stage(
  p_report_id uuid,
  p_direction text, -- 'advance' | 'revert'
  p_meeting_date date default null -- no longer used; kept so existing callers still match
)
returns report_stage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_role user_role;
  v_is_handler boolean;
  v_current report_stage;
  v_closed_at timestamptz;
  v_stages report_stage[] := array['case_filed', 'investigation', 'case_closed']::report_stage[];
  v_idx int;
begin
  v_caller_role := current_profile_role();
  if v_caller_role not in ('staff', 'admin') then
    raise exception 'Only staff or admin can update stage progress';
  end if;

  select current_stage, case_closed_at into v_current, v_closed_at
  from report_stage_progress
  where report_id = p_report_id
  for update;

  if v_current is null then
    raise exception 'No stage progress row for report %', p_report_id;
  end if;

  -- Admin (Handler) and Developer can act on any report; a plain Teacher
  -- only on one they've been tagged into (report_teacher_tags).
  if v_caller_role = 'staff' then
    select is_handler into v_is_handler from profiles where id = v_caller;

    if not coalesce(v_is_handler, false) then
      if not exists (
        select 1 from report_teacher_tags where report_id = p_report_id and teacher_id = v_caller
      ) then
        raise exception 'You are not tagged into this report';
      end if;
    end if;
  end if;

  -- A report still at the retired Scheduling step counts as Ongoing Action.
  if v_current = 'meeting' then
    v_current := 'investigation';
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
          updated_by = v_caller
        where report_id = p_report_id;
    end if;
  elsif p_direction = 'revert' then
    if v_current = 'case_closed' and v_closed_at is not null then
      -- Undo "Case Resolved" only — stay at the case_closed stage, just pending again.
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
