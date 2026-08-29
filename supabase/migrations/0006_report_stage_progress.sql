-- =========================================================
-- Amoma — Report Status Tracker (4-stage progress)
-- File: supabase/migrations/0006_report_stage_progress.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Backs the horizontal 4-stage tracker shown to Student (read-only,
-- animated), Staff (as an actionable checklist that drives it), and Admin
-- (read-only, with an extra oversight icon prepended in the UI only).
--
-- `reports.status` (unresolved/in_process/resolved) still drives the
-- Staff/Admin queue-level dashboards — this table tracks the finer-grained
-- 4-stage progress and, when the final stage closes, also flips
-- reports.status to 'resolved' in the same transaction (see
-- advance_report_stage below).
-- =========================================================

create type report_stage as enum (
  'case_filed',
  'investigation',
  'meeting',
  'case_closed'
);

create table report_stage_progress (
  report_id uuid primary key references reports (id) on delete cascade,
  current_stage report_stage not null default 'case_filed',
  case_filed_completed_at timestamptz,
  investigation_completed_at timestamptz,
  meeting_completed_at timestamptz,
  case_closed_at timestamptz,
  meeting_tentative_date date,
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now()
);

alter table report_stage_progress enable row level security;

create policy "Reporter can view their own report's stage progress"
  on report_stage_progress for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_stage_progress.report_id and r.reporter_id = auth.uid()
    )
  );

create policy "Staff/Admin can view all stage progress"
  on report_stage_progress for select
  using (current_profile_role() in ('staff', 'admin'));

-- Direct client UPDATEs are locked to a report's assigned staff member, same
-- as `reports` itself — but in practice all writes go through
-- advance_report_stage() below (SECURITY DEFINER), which also handles
-- self-assigning an unassigned report to whichever staff member acts on it
-- first, the same "first write wins" pattern already used by
-- updateReportStatus() in app/staff/actions.ts. This policy exists as
-- defense-in-depth for any future direct-table write path.
create policy "Assigned staff can update stage progress"
  on report_stage_progress for update
  using (
    current_profile_role() = 'staff'
    and exists (
      select 1 from reports r
      where r.id = report_stage_progress.report_id and r.assigned_staff_id = auth.uid()
    )
  );

create trigger trg_stage_progress_updated_at
  before update on report_stage_progress
  for each row execute function set_updated_at();

-- Every report gets a stage-progress row the moment it's created — the app
-- never has to remember to create one on every current/future report-
-- submission code path. SECURITY DEFINER so it works regardless of whether
-- the report insert itself came from an authenticated student or the
-- service role.
create or replace function create_report_stage_progress()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into report_stage_progress (report_id) values (new.id)
  on conflict (report_id) do nothing;
  return new;
end;
$$;

create trigger trg_create_stage_progress
  after insert on reports
  for each row execute function create_report_stage_progress();

-- Backfill: reports that already existed before this migration ran.
insert into report_stage_progress (report_id)
select id from reports
on conflict (report_id) do nothing;

-- Atomically advances or reverts a report's stage, and — only when a
-- report is actually closed or reopened — updates reports.status in the
-- SAME transaction, exactly as the spec requires (never two separate
-- client calls). SECURITY DEFINER lets a staff member act on a report
-- before they're formally assigned to it (mirrors updateReportStatus()'s
-- "whoever changes it becomes its owner" behavior) while still checking the
-- caller is staff/admin itself.
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

  select current_stage, case_closed_at into v_current, v_closed_at
  from report_stage_progress
  where report_id = p_report_id
  for update;

  if v_current is null then
    raise exception 'No stage progress row for report %', p_report_id;
  end if;

  v_idx := array_position(v_stages, v_current);

  -- Same "whoever acts on it becomes its owner" rule as updateReportStatus()
  -- in app/staff/actions.ts — only for staff; Admin acting on a report
  -- doesn't make them its assigned staff member.
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

grant execute on function advance_report_stage(uuid, text, date) to authenticated;

-- Live updates: Staff checking an item off updates Student's and Admin's
-- open tracker views without a page refresh.
alter publication supabase_realtime add table report_stage_progress;

-- =========================================================
-- End of migration
-- =========================================================
