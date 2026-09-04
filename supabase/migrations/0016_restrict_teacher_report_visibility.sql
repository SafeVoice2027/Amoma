-- =========================================================
-- Amoma — Restrict plain-Teacher report visibility to tagged reports
-- File: supabase/migrations/0016_restrict_teacher_report_visibility.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Every "Staff can view X" policy since 0001_init_schema.sql was a blanket
-- `current_profile_role() in ('staff', 'admin')` check — meaning any
-- approved Teacher could see every report at the school, full content
-- included, whether or not they had anything to do with it. That was never
-- the intended design: a plain Teacher should only see a report once a
-- Handler/Admin tags them into it (see report_teacher_tags in
-- 0010_handlers_and_teacher_tags.sql) — otherwise nothing shows up on their
-- task board or urgent alerts at all. This is specifically to avoid gossip
-- among teachers about students who never involved them.
--
-- Handlers and Admin/Developer are unaffected — they still see everything,
-- since someone has to be able to triage an incoming report before anyone
-- can be tagged into it.
--
-- 0010 already added a narrower "Tagged teacher can view stage progress"
-- policy on report_stage_progress, but never dropped 0006's blanket one —
-- Postgres OR's every matching SELECT policy together, so the blanket
-- policy alone kept every Teacher able to see every report's stage progress
-- regardless of tagging. This migration is what actually makes tagging mean
-- something.
-- =========================================================

-- One helper, reused by every table below, so "can this caller see this
-- report as staff" is defined exactly once. SECURITY DEFINER so it can read
-- profiles.is_handler / report_teacher_tags internally without itself being
-- blocked by those tables' own RLS (same reasoning as current_profile_role()).
create or replace function can_staff_view_report(p_report_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    current_profile_role() = 'admin'
    or (
      current_profile_role() = 'staff'
      and (
        exists (select 1 from profiles where id = auth.uid() and is_handler)
        or exists (
          select 1 from report_teacher_tags t
          where t.report_id = p_report_id and t.teacher_id = auth.uid()
        )
      )
    );
$$;

-- ---- reports ----
drop policy if exists "Staff can view reports (content only; app layer masks identity when anonymous)" on reports;
create policy "Staff can view reports they're tagged into (Handlers/Admin see all)"
  on reports for select
  using (can_staff_view_report(id));

-- ---- report_bully_details ----
drop policy if exists "Access bully details via parent report" on report_bully_details;
create policy "Access bully details via parent report"
  on report_bully_details for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_bully_details.report_id
        and (r.reporter_id = auth.uid() or can_staff_view_report(r.id))
    )
  );

-- ---- report_conflict_details ----
drop policy if exists "Access conflict details via parent report" on report_conflict_details;
create policy "Access conflict details via parent report"
  on report_conflict_details for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_conflict_details.report_id
        and (r.reporter_id = auth.uid() or can_staff_view_report(r.id))
    )
  );

-- ---- report_evidence ----
drop policy if exists "Access evidence via parent report" on report_evidence;
create policy "Access evidence via parent report"
  on report_evidence for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_evidence.report_id
        and (r.reporter_id = auth.uid() or can_staff_view_report(r.id))
    )
  );

-- ---- report_followups (select AND insert — a non-tagged Teacher shouldn't
-- be able to read or post into a thread on a report they can't see) ----
drop policy if exists "Access followups via parent report" on report_followups;
create policy "Access followups via parent report"
  on report_followups for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_followups.report_id
        and (r.reporter_id = auth.uid() or can_staff_view_report(r.id))
    )
  );

drop policy if exists "Reporter or staff/admin can add followups" on report_followups;
create policy "Reporter or staff/admin can add followups"
  on report_followups for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from reports r
      where r.id = report_followups.report_id
        and (r.reporter_id = auth.uid() or can_staff_view_report(r.id))
    )
  );

-- ---- ai_assessments ---- (previously had no report join at all — the
-- blanket role check alone gated it, so this was actually MORE exposed than
-- the tables above)
drop policy if exists "Staff/Admin can view AI assessments" on ai_assessments;
create policy "Staff/Admin can view AI assessments" on ai_assessments
  for select
  using (can_staff_view_report(report_id));

-- ---- report_stage_progress ---- (see the migration comment up top — this
-- is what actually activates 0010's "Tagged teacher can view stage
-- progress" policy, which the blanket one below had been overriding)
drop policy if exists "Staff/Admin can view all stage progress" on report_stage_progress;
create policy "Handler/Admin can view all stage progress"
  on report_stage_progress for select
  using (
    current_profile_role() = 'admin'
    or exists (select 1 from profiles where id = auth.uid() and is_handler)
  );

-- ---- storage: report_evidence bucket ----
drop policy if exists "Reporter or staff/admin can read evidence for a visible report" on storage.objects;
create policy "Reporter or staff/admin can read evidence for a visible report"
  on storage.objects for select
  using (
    bucket_id = 'report_evidence'
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and (r.reporter_id = auth.uid() or can_staff_view_report(r.id))
    )
  );

-- =========================================================
-- End of migration
-- =========================================================
