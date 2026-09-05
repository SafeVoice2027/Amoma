-- =========================================================
-- Amoma — Fix broken report_evidence insert policy
-- File: supabase/migrations/0020_fix_report_evidence_insert_policy.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Live diagnosis: with 0019 applied, a student's evidence file now
-- actually reaches Storage — but recording it in report_evidence (the
-- table that drives what staff see under "Evidence" on a report) was still
-- rejected with the exact same "new row violates row-level security
-- policy" error. Same class of bug as 0014, 0016's storage.objects SELECT
-- policy, and 0019's storage.objects INSERT policy — this is the fourth
-- policy found so far that was in 0001_init_schema.sql but never actually
-- took effect live. A systematic re-test of every other client-facing
-- insert/update policy from that migration (report_conflict_details,
-- report_followups, reports) came back clean — this was the only other
-- casualty.
-- =========================================================

drop policy if exists "Reporter can insert evidence on their own report" on report_evidence;
create policy "Reporter can insert evidence on their own report"
  on report_evidence for insert
  with check (
    exists (select 1 from reports r where r.id = report_evidence.report_id and r.reporter_id = auth.uid())
  );

-- =========================================================
-- End of migration
-- =========================================================
