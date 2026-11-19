-- =========================================================
-- Amoma — Remember which students were in the latest SF1 import
-- File: supabase/migrations/0036_sf1_tracking.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- last_in_sf1_at  — stamped on every student an "Import students" run includes
--                   (all students in one import share the same time). A student
--                   with an older time (or none) than the school's latest
--                   import was NOT in the latest files, so the page asks
--                   whether they transferred, graduated, or are still enrolled.
-- sf1_confirmed_at — set when an Admin answers "still enrolled", so the page
--                   stops asking about that student until the next import.
-- =========================================================

alter table profiles
  add column if not exists last_in_sf1_at timestamptz,
  add column if not exists sf1_confirmed_at timestamptz;

-- =========================================================
-- End of migration
-- =========================================================
