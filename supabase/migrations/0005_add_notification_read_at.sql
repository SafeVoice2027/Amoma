-- =========================================================
-- Amoma — Notification read-state + student reply alerts
-- File: supabase/migrations/0005_add_notification_read_at.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Powers the student home page's notification bell: staff/admin replying to
-- a report's follow-up thread now inserts a row here for the reporter (see
-- lib/reports/followups.ts), and the student can mark their own
-- notifications read from the bell dropdown.
-- =========================================================

alter table notifications add column read_at timestamptz;

create policy "Recipients can mark their own notifications read"
  on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- =========================================================
-- End of migration
-- =========================================================
