-- =========================================================
-- Amoma — Rename severity "critical" to "complex"
-- File: supabase/migrations/0027_rename_critical_to_complex.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- The top severity level is now called "Complex" everywhere. This renames
-- the stored enum value itself (0025 only re-labelled it in the UI), so
-- every report and AI assessment already stored as 'critical' reads as
-- 'complex' with no row rewrites. Run this BEFORE deploying the matching
-- app code — until then the app looks for 'complex' and the database still
-- says 'critical'.
-- =========================================================

do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'severity_level' and e.enumlabel = 'critical'
  ) then
    alter type severity_level rename value 'critical' to 'complex';
  end if;
end
$$;

-- Frozen annual reports keep their severity counts as jsonb keyed by level.
update annual_reports
set breakdown_by_severity =
  (breakdown_by_severity - 'critical')
  || jsonb_build_object('complex', breakdown_by_severity -> 'critical')
where breakdown_by_severity ? 'critical';

-- =========================================================
-- End of migration
-- =========================================================
