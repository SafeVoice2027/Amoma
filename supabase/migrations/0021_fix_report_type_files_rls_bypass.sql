-- =========================================================
-- Amoma — Fix report_type_files bypassing RLS entirely
-- File: supabase/migrations/0021_fix_report_type_files_rls_bypass.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Same bug as 0017_fix_staff_reports_view_rls_bypass.sql, in a new view:
-- Postgres views execute with the *view owner's* permissions by default,
-- not the querying user's, for row-security purposes. report_type_files
-- (the bullying-type folder view from the Filing System addendum) was
-- created as a plain view, so an untagged Teacher querying it got back
-- every report's type-file rows, not just the ones they're tagged into —
-- exactly the gap the addendum's own build notes said to test for
-- ("Test the Teacher-side folder view specifically with a Teacher account
-- that has zero tags — it should show empty folders, not an error").
--
-- security_invoker = true makes the view evaluate with the querying user's
-- own permissions, so the RLS already correctly enforced on `reports` and
-- `report_bully_details` actually applies when read through this view too.
-- =========================================================

alter view report_type_files set (security_invoker = true);

-- =========================================================
-- End of migration
-- =========================================================
