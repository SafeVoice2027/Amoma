-- =========================================================
-- Amoma — Bug Reports (Help Hub)
-- File: supabase/migrations/0003_add_bug_reports.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Backs the student-facing "Help Hub" -> "Report a bug" form. Separate from
-- the `reports` table on purpose: this is app feedback, not a bullying/
-- conflict report, and must never be visible to school staff — only Admin.
-- =========================================================

create type bug_report_category as enum ('login', 'report_submission', 'notifications', 'app_bug', 'other');
create type bug_report_status as enum ('open', 'resolved');

create table bug_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  category bug_report_category not null,
  other_category text,          -- populated only when category = 'other'
  description text not null,
  status bug_report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index idx_bug_reports_reporter on bug_reports (reporter_id);
create index idx_bug_reports_status on bug_reports (status);

alter table bug_reports enable row level security;

create policy "Students can insert their own bug reports"
  on bug_reports for insert
  with check (reporter_id = auth.uid());

create policy "Reporter can view their own bug reports"
  on bug_reports for select
  using (reporter_id = auth.uid());

-- Bug reports are app feedback, not bullying/conflict cases — Admin only,
-- not Staff (unlike `reports`, which Staff can also see).
create policy "Admin can view all bug reports"
  on bug_reports for select
  using (current_profile_role() = 'admin');

create policy "Admin can update bug reports"
  on bug_reports for update
  using (current_profile_role() = 'admin');

-- =========================================================
-- End of migration
-- =========================================================
