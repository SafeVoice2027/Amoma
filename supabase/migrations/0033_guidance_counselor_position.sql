-- =========================================================
-- Amoma — Add "Guidance Counselor" as an Admin position
-- File: supabase/migrations/0033_guidance_counselor_position.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Admin accounts (staff with is_handler = true) carry a position (0026):
-- Learner Formation Officer or School Head. The Guidance Counselor works
-- Serious cases alongside the Learner Formation Officer, so it gets its own
-- position too. Like the others it's chosen by the Developer on the Accounts
-- screen; all positions see the same Admin dashboard.
-- =========================================================

alter type admin_position add value if not exists 'guidance_counselor';

-- =========================================================
-- End of migration
-- =========================================================
