-- =========================================================
-- Amoma — Student meeting-attendance response
-- File: supabase/migrations/0008_meeting_response.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Once a report reaches the "meeting" stage, the student is asked whether
-- they're willing to attend and state their concerns, or would rather not
-- attend — framed as a genuine either/or, never a requirement to attend.
-- Staff sees the answer the moment it's saved via the same postgres_changes
-- realtime channel report_stage_progress already publishes to (see
-- supabase/migrations/0006_report_stage_progress.sql).
-- =========================================================

alter table report_stage_progress
  add column student_meeting_response text
    check (student_meeting_response in ('attending', 'not_attending'));

-- Only the report's own reporter can set their own meeting response —
-- SECURITY DEFINER so this can run without a broad client-facing UPDATE
-- policy on the table, same pattern as mark_report_status_seen() in
-- supabase/migrations/0007_stage_progress_seen.sql. Also stamps
-- student_seen_at so submitting an answer doesn't itself look like a new
-- staff update the student hasn't seen yet (see hasStageUpdate() in
-- lib/reports/stage-labels.ts).
create or replace function submit_meeting_response(p_report_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_response not in ('attending', 'not_attending') then
    raise exception 'Invalid meeting response %', p_response;
  end if;

  update report_stage_progress
  set student_meeting_response = p_response,
      student_seen_at = now()
  where report_id = p_report_id
    and exists (
      select 1 from reports r
      where r.id = p_report_id and r.reporter_id = auth.uid()
    );
end;
$$;

grant execute on function submit_meeting_response(uuid, text) to authenticated;

-- =========================================================
-- End of migration
-- =========================================================
