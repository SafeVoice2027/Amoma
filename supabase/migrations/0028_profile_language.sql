-- =========================================================
-- Amoma — Student language preference
-- File: supabase/migrations/0028_profile_language.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- A student can pick the app's language (English / Tagalog / Bisaya) in
-- Settings. It's stored on their profile so it follows them to another
-- device; NULL means they've never chosen one (English, unless this device
-- has a language cookie). Until this runs, the choice still works per
-- device through the cookie alone.
-- =========================================================

alter table profiles add column if not exists language text;

alter table profiles drop constraint if exists profiles_language_valid;
alter table profiles
  add constraint profiles_language_valid check (language is null or language in ('en', 'tl', 'ceb'));

-- =========================================================
-- End of migration
-- =========================================================
