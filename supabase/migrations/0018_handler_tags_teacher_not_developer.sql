-- =========================================================
-- Amoma — Handler (Admin) tags a Teacher, not Developer
-- File: supabase/migrations/0018_handler_tags_teacher_not_developer.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- 0010_handlers_and_teacher_tags.sql gated tagging to
-- `current_profile_role() = 'admin'` — at the time that meant the one real
-- admin role. Since the Handler/Admin/Developer rebrand, that DB role is
-- branded "Developer" and Handlers are branded "Admin" — so tagging ended
-- up backwards from the intended design: it's Admin (Handler) who tags a
-- Teacher into a report day-to-day, not Developer (whose role everywhere
-- else is read-only oversight — see the Case status tracker split in
-- app/admin/(protected)/reports/[id]/page.tsx). Developer keeps read
-- access to the sent-tag history for that same oversight reason, just not
-- the ability to create one.
-- =========================================================

drop policy if exists "Only admin can create teacher tags" on report_teacher_tags;
create policy "Handler can create teacher tags"
  on report_teacher_tags for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_handler));

drop policy if exists "Admin can view all teacher tags" on report_teacher_tags;
create policy "Handler/Developer can view all teacher tags"
  on report_teacher_tags for select
  using (
    current_profile_role() = 'admin'
    or exists (select 1 from profiles where id = auth.uid() and is_handler)
  );

-- =========================================================
-- End of migration
-- =========================================================
