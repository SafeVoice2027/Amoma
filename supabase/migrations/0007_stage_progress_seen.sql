-- =========================================================
-- Amoma — Report status "seen" tracking
-- File: supabase/migrations/0007_stage_progress_seen.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Powers the notification-count badge on the student's "Report status" icon
-- and the per-report exclamation mark in its dropdown: a report "has an
-- update" when staff has actually acted on it (updated_by is set) since the
-- student last viewed that report's status page.
-- =========================================================

alter table report_stage_progress add column student_seen_at timestamptz;

-- Only the report's own reporter can mark it seen, and only the
-- student_seen_at column is ever touched — SECURITY DEFINER so this can run
-- without a broad client-facing UPDATE policy on the table (the existing
-- "Assigned staff can update" policy is unrelated and stays as-is).
create or replace function mark_report_status_seen(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update report_stage_progress
  set student_seen_at = now()
  where report_id = p_report_id
    and exists (
      select 1 from reports r
      where r.id = p_report_id and r.reporter_id = auth.uid()
    );
end;
$$;

grant execute on function mark_report_status_seen(uuid) to authenticated;

-- =========================================================
-- End of migration
-- =========================================================
