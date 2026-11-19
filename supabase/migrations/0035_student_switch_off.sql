-- =========================================================
-- Amoma — Switching off student accounts (graduated / transferred)
-- File: supabase/migrations/0035_student_switch_off.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- A switched-off student can't log in any more. Nothing is deleted: the
-- account, and every report they filed, stay exactly as they were, and the
-- account can be switched back on. These two columns only record when and
-- why it was switched off (status itself becomes 'suspended').
-- =========================================================

alter table profiles
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_reason text;

-- =========================================================
-- End of migration
-- =========================================================
