-- =========================================================
-- Amoma — Reorder Report Status flow, drop the meeting-attendance step
-- File: supabase/migrations/0012_reorder_stage_flow.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- The 4-stage flow now runs Case Filed -> Scheduling -> Investigation &
-- Counseling -> Case Closed (previously Case Filed -> Investigation ->
-- Meeting -> Case Closed). The stage IS values are unchanged ('meeting' is
-- still the enum member used for the "Scheduling" step, 'investigation'
-- still the one used for "Investigation & Counseling") — only the ORDER
-- they're traversed in changes, which is entirely governed by the
-- `v_stages` array below. Every *_completed_at column is still set by
-- current-stage NAME (see the CASE branches further down), so reordering
-- this array is the only change needed to resequence the flow.
--
-- The "Scheduling" step no longer asks the student whether they'll attend
-- a meeting — same body as
-- supabase/migrations/0010_handlers_and_teacher_tags.sql, just the
-- reordered array.
-- =========================================================

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
  v_stages report_stage[] := array['case_filed', 'meeting', 'investigation', 'case_closed']::report_stage[];
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
