-- =========================================================
-- Amoma — Fix broken evidence-upload storage policy
-- File: supabase/migrations/0019_fix_evidence_upload_policy.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Live diagnosis: a student's own evidence upload (any size, even a few
-- bytes — this has nothing to do with the Server Actions body-size-limit
-- fix in next.config.ts) was rejected with "new row violates row-level
-- security policy", even though the report's reporter_id genuinely matches
-- the uploader. Same class of bug as 0016's storage.objects SELECT policy,
-- which turned out to have never actually been created live despite being
-- in 0001_init_schema.sql — this is that migration's matching INSERT
-- policy, likely a casualty of the same partial run. Drops and recreates it
-- verbatim so the live database matches what 0001 always intended.
-- =========================================================

drop policy if exists "Reporter can upload evidence for their own report" on storage.objects;
create policy "Reporter can upload evidence for their own report"
  on storage.objects for insert
  with check (
    bucket_id = 'report_evidence'
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.reporter_id = auth.uid()
    )
  );

-- =========================================================
-- End of migration
-- =========================================================
