-- =========================================================
-- Amoma — Every role can tick the case checklist
-- File: supabase/migrations/0024_all_roles_drive_case_checklist.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Supersedes 0015_teacher_scheduling_permission.sql. That migration let a
-- tagged Teacher advance only the Scheduling step; the decision is now that
-- Teacher, Admin (Handler) and Developer can all tick and untick every step
-- of the checklist.
--
-- A Teacher still has to be tagged into the report first — an untagged
-- Teacher can't see the report at all (0016), and the RPC below refuses
-- them too, since it's SECURITY DEFINER and bypasses table RLS.
-- =========================================================

drop policy if exists "Tagged teacher can update stage progress while it's at Scheduling" on report_stage_progress;
create policy "Tagged teacher can update stage progress"
  on report_stage_progress for update
  using (
    current_profile_role() = 'staff'
    and exists (
      select 1 from report_teacher_tags t
      where t.report_id = report_stage_progress.report_id and t.teacher_id = auth.uid()
    )
  );

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
  v_is_handler boolean;
  v_current report_stage;
  v_closed_at timestamptz;
  v_stages report_stage[] := array['case_filed', 'meeting', 'investigation', 'case_closed']::report_stage[];
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
