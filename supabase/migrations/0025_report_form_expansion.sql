-- =========================================================
-- Amoma — Report form expansion + "Precursor" severity level
-- File: supabase/migrations/0025_report_form_expansion.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- 1. Two new bullying types: Emotional and Gender-based.
-- 2. Setting is now three inputs (date / time / place). `setting` keeps the
--    combined human-readable string so existing screens and the AI
--    classifier keep working; the structured parts are stored alongside.
-- 3. Per-type follow-up answers (e.g. which platform for Cyber) live in a
--    jsonb column, shaped { "<type>": { "choices": [...], "other": "..." } }.
-- 4. New lowest severity level "precursor" (precursor to bullying — DepEd
--    Memorandum 090, s. 2025), handled by teachers. The existing 'critical'
--    value is only re-labelled "Complex" in the UI; the enum value itself is
--    unchanged so nothing stored needs rewriting.
-- =========================================================

-- --- 1. New bullying types ---------------------------------------------------

alter table report_bully_details drop constraint if exists bullying_types_valid;
alter table report_bully_details
  add constraint bullying_types_valid
  check (bullying_types <@ array['social', 'cyber', 'physical', 'verbal', 'emotional', 'gender_based']);

-- reports.category (0002) is its own enum and holds the first-selected type.
alter type report_category add value if not exists 'emotional';
alter type report_category add value if not exists 'gender_based';

-- --- 2 + 3. Structured setting + per-type answers ---------------------------

alter table report_bully_details
  add column if not exists incident_date date,
  add column if not exists incident_time time,
  add column if not exists incident_place text,
  add column if not exists type_details jsonb not null default '{}'::jsonb;

-- --- 4. Precursor severity ---------------------------------------------------

alter type severity_level add value if not exists 'precursor' before 'minor';

-- --- Bullying-type folders ---------------------------------------------------
-- The folder view is rebuilt so it unnests whatever types a report carries
-- (so Emotional / Gender-based get their own folders with no further
-- changes). Same columns as before; security_invoker keeps RLS applying to
-- the querying user, exactly as 0021 set it up.

drop view if exists report_type_files;
create view report_type_files as
select
  r.id as report_id,
  t.bullying_type,
  r.status,
  r.severity,
  r.created_at,
  r.school_id
from reports r
join report_bully_details d on d.report_id = r.id
cross join lateral unnest(d.bullying_types) as t(bullying_type);

alter view report_type_files set (security_invoker = true);
grant select on report_type_files to authenticated;

-- =========================================================
-- End of migration
-- =========================================================
