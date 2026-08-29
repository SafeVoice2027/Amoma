-- =========================================================
-- Amoma — Add report category classification
-- File: supabase/migrations/0002_add_report_category.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Bully reports are self-classified by the student in Step 2 of the report
-- wizard as social / cyber / physical / verbal. Conflict reports are tagged
-- 'conflict' directly at submission time — they aren't a form of bullying.
-- =========================================================

create type report_category as enum ('social', 'cyber', 'physical', 'verbal', 'conflict');

alter table reports
  add column category report_category;

create index idx_reports_category on reports (category);

-- staff_reports_view selects `r.*`, so the new column is already exposed
-- there with no view changes needed.
