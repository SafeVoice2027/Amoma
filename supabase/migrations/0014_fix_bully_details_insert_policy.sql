-- =========================================================
-- Amoma — Fix broken insert policy on report_bully_details
-- File: supabase/migrations/0014_fix_bully_details_insert_policy.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Live diagnosis: a student's own report_bully_details insert (done with
-- their own session, right after they insert their own row into `reports`)
-- is being rejected with "new row violates row-level security policy for
-- table report_bully_details" (Postgres code 42501) — even though the
-- policy text in 0001_init_schema.sql looks correct and `reports.reporter_id`
-- genuinely equals `auth.uid()` for the row being checked. Whatever the
-- cause (a partial failure the first time 0001 was pasted into the SQL
-- editor is the leading suspect), this drops and recreates both policies
-- verbatim so the live database matches what 0001 always intended.
--
-- This is what silently broke "People Involved" / "Setting" showing "—" on
-- every report even after 0009 added the columns — the insert into
-- report_bully_details never happens at all, it's not a missing-column or
-- display issue.
-- =========================================================

alter table report_bully_details enable row level security;

drop policy if exists "Access bully details via parent report" on report_bully_details;
create policy "Access bully details via parent report"
  on report_bully_details for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_bully_details.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

drop policy if exists "Reporter can insert bully details on their own report" on report_bully_details;
create policy "Reporter can insert bully details on their own report"
  on report_bully_details for insert
  with check (
    exists (select 1 from reports r where r.id = report_bully_details.report_id and r.reporter_id = auth.uid())
  );

-- report_conflict_details isn't reachable from the student-facing flow
-- anymore, but keep its matching policies correct too — staff/admin still
-- read existing conflict reports through it, and there's no reason to leave
-- it in a possibly-broken state.
alter table report_conflict_details enable row level security;

drop policy if exists "Access conflict details via parent report" on report_conflict_details;
create policy "Access conflict details via parent report"
  on report_conflict_details for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_conflict_details.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

drop policy if exists "Reporter can insert conflict details on their own report" on report_conflict_details;
create policy "Reporter can insert conflict details on their own report"
  on report_conflict_details for insert
  with check (
    exists (select 1 from reports r where r.id = report_conflict_details.report_id and r.reporter_id = auth.uid())
  );

-- =========================================================
-- End of migration
-- =========================================================
