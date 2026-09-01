-- =========================================================
-- Amoma — Consolidated 2-page report format
-- File: supabase/migrations/0009_consolidated_report_fields.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Replaces the old multi-step Bully/Conflict wizard's fields with the new
-- consolidated shape: a multi-select bullying-type tag set, structured
-- victim/oppressor grade+section (+ optional oppressor name), and a single
-- free-text "Setting" field (where/when), shared by both report types.
--
-- `location`, `occurred_at`, `witnesses`, and `offender_description` are
-- dropped from report_bully_details — all superseded by the new
-- victim/oppressor fields and the single `setting` field. `happened_before`
-- / `prior_incident_details` are dropped too — the new form doesn't ask
-- whether this has happened before. report_conflict_details drops
-- `dominant_party_description`, `wants_solution`, and
-- `wants_breathing_exercise` — the "what support do you want" step is gone
-- from the form itself (see the app's own note on that removal).
-- =========================================================

alter table report_bully_details
  drop column if exists happened_before,
  drop column if exists prior_incident_details,
  drop column if exists offender_description,
  drop column if exists location,
  drop column if exists occurred_at,
  drop column if exists witnesses;

alter table report_bully_details
  add column bullying_types text[] not null default '{}',
  add column victim_grade_section text,
  add column oppressor_grade_section text,
  add column oppressor_name text,       -- optional
  add column setting text;              -- "where and when" free text

alter table report_bully_details
  add constraint bullying_types_valid
  check (bullying_types <@ array['social', 'cyber', 'physical', 'verbal']);

alter table report_conflict_details
  drop column if exists dominant_party_description,
  drop column if exists wants_solution,
  drop column if exists wants_breathing_exercise;

alter table report_conflict_details
  add column victim_grade_section text,
  add column oppressor_grade_section text,
  add column oppressor_name text,       -- optional
  add column setting text;              -- "where and when" free text
  -- conflict_reason (already exists) now holds the full "What's Going On?"
  -- text, including the "what outcome did you expect" portion.

-- =========================================================
-- End of migration
-- =========================================================
