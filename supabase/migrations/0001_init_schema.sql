-- =========================================================
-- Amoma — Initial Supabase Schema Migration
-- File: supabase/migrations/0001_init_schema.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor for a first pass)
--
-- This is the original migration this project's live Supabase database was
-- provisioned from (recovered from a stray `Migration.db` file found at the
-- project root — its origin is unconfirmed, but its schema matches the live
-- project's PostgREST OpenAPI document exactly, table for table, column for
-- column). The storage bucket section at the end is new — the original
-- didn't define one.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------
create type user_role as enum ('student', 'staff', 'admin');
create type account_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type report_type as enum ('bully', 'conflict');
create type report_status as enum ('unresolved', 'in_process', 'resolved');
create type severity_level as enum ('minor', 'less_serious', 'serious', 'critical');
create type notification_channel as enum ('push', 'sms', 'email');
create type notification_urgency as enum ('normal', 'high');

-- ---------------------------------------------------------
-- 2. Schools (supports multi-school deployments)
-- ---------------------------------------------------------
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  deped_school_id text unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. Profiles (extends auth.users with Amoma-specific data)
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  school_id uuid references schools (id) on delete set null,
  full_name text,                 -- collected but access-restricted via RLS
  lrn text unique,                -- students only
  deped_email text unique,        -- staff/admin only
  status account_status not null default 'pending',
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles (role);
create index idx_profiles_school on profiles (school_id);

-- ---------------------------------------------------------
-- 4. Reports (shared fields across Bully + Conflict)
-- ---------------------------------------------------------
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles (id) on delete restrict,
  school_id uuid references schools (id),
  type report_type not null,
  is_anonymous boolean not null default false,
  immediate_danger boolean not null default false,
  status report_status not null default 'unresolved',
  severity severity_level,                     -- populated by AI assessment
  assigned_staff_id uuid references profiles (id),
  description text,                            -- free-text incident description (Step 2, Bully flow)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reports_reporter on reports (reporter_id);
create index idx_reports_status on reports (status);
create index idx_reports_severity on reports (severity);
create index idx_reports_school on reports (school_id);

-- ---------------------------------------------------------
-- 5. Bully-specific details (Steps 3–4 of the Bully flow)
-- ---------------------------------------------------------
create table report_bully_details (
  report_id uuid primary key references reports (id) on delete cascade,
  offender_description text,          -- name or description of offender(s)
  happened_before boolean,
  prior_incident_details text,        -- populated if happened_before = true
  location text,
  occurred_at timestamptz,
  witnesses text
);

-- ---------------------------------------------------------
-- 6. Conflict-specific details (Steps 2–3 of the Conflict flow)
-- ---------------------------------------------------------
create table report_conflict_details (
  report_id uuid primary key references reports (id) on delete cascade,
  conflict_reason text,
  dominant_party_description text,
  wants_solution boolean,
  wants_breathing_exercise boolean
);

-- ---------------------------------------------------------
-- 7. Evidence (optional, Step 5 of the Bully flow)
--    Files live in Supabase Storage; this table stores metadata only.
-- ---------------------------------------------------------
create table report_evidence (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references reports (id) on delete cascade,
  storage_path text not null,          -- path within the Supabase Storage bucket
  file_type text not null,             -- 'video' | 'screen_recording' | 'screenshot' | 'photo'
  uploaded_by uuid not null references profiles (id),
  uploaded_at timestamptz not null default now()
);

create index idx_evidence_report on report_evidence (report_id);

-- ---------------------------------------------------------
-- 8. Follow-up thread (keeps a report's Q&A history together)
-- ---------------------------------------------------------
create table report_followups (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references reports (id) on delete cascade,
  author_id uuid not null references profiles (id),
  message text not null,
  created_at timestamptz not null default now()
);

create index idx_followups_report on report_followups (report_id);

-- ---------------------------------------------------------
-- 9. AI assessments (kept separate to preserve history across re-analysis)
-- ---------------------------------------------------------
create table ai_assessments (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references reports (id) on delete cascade,
  severity severity_level not null,
  recommendation text,                 -- guidance shown to the student
  staff_summary text,                  -- summary shown on staff/admin dashboards
  model_version text,
  created_at timestamptz not null default now()
);

create index idx_assessments_report on ai_assessments (report_id);

-- ---------------------------------------------------------
-- 10. Identity disclosure log (Data Privacy Act audit trail)
--     App code must INSERT here any time an anonymous report's
--     reporter_id is revealed to Staff/authorities.
-- ---------------------------------------------------------
create table identity_disclosure_log (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references reports (id) on delete cascade,
  disclosed_to uuid not null references profiles (id),
  disclosed_by uuid references profiles (id),   -- admin who authorized it, if applicable
  reason text not null,
  disclosed_at timestamptz not null default now()
);

create index idx_disclosure_report on identity_disclosure_log (report_id);

-- ---------------------------------------------------------
-- 11. Notifications (counselor/staff alerts)
-- ---------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references reports (id) on delete cascade,
  recipient_id uuid not null references profiles (id),
  channel notification_channel not null,
  urgency notification_urgency not null default 'normal',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient on notifications (recipient_id);

-- ---------------------------------------------------------
-- 12. updated_at triggers
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_reports_updated_at
  before update on reports
  for each row execute function set_updated_at();

-- =========================================================
-- 13. Row Level Security
-- =========================================================

alter table schools enable row level security;
alter table profiles enable row level security;
alter table reports enable row level security;
alter table report_bully_details enable row level security;
alter table report_conflict_details enable row level security;
alter table report_evidence enable row level security;
alter table report_followups enable row level security;
alter table ai_assessments enable row level security;
alter table identity_disclosure_log enable row level security;
alter table notifications enable row level security;

-- Helper: read the caller's role/approval status without recursive RLS lookups.
-- SECURITY DEFINER lets this bypass RLS internally so policies can call it safely.
create or replace function current_profile_role()
returns user_role
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_profile_status()
returns account_status
language sql
security definer
stable
as $$
  select status from profiles where id = auth.uid();
$$;

-- ---- profiles ----
create policy "Users can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Staff/Admin can view profiles in their school"
  on profiles for select
  using (current_profile_role() in ('staff', 'admin'));

create policy "Admin can update any profile (approvals, roles)"
  on profiles for update
  using (current_profile_role() = 'admin');

create policy "Users can update limited fields on their own profile"
  on profiles for update
  using (id = auth.uid());

create policy "Anyone can create their own profile at signup"
  on profiles for insert
  with check (id = auth.uid());

-- ---- reports ----
create policy "Students can insert their own reports"
  on reports for insert
  with check (
    reporter_id = auth.uid()
    and current_profile_role() = 'student'
    and current_profile_status() = 'approved'
  );

create policy "Students can view their own reports"
  on reports for select
  using (reporter_id = auth.uid());

create policy "Staff can view reports (content only; app layer masks identity when anonymous)"
  on reports for select
  using (current_profile_role() in ('staff', 'admin'));

create policy "Staff can update reports assigned to them"
  on reports for update
  using (
    current_profile_role() = 'staff'
    and assigned_staff_id = auth.uid()
  );

create policy "Admin can update any report"
  on reports for update
  using (current_profile_role() = 'admin');

-- NOTE: Postgres RLS controls row visibility, not column visibility.
-- To actually hide `reporter_id` from Staff on anonymous reports, either:
--   (a) expose reports to Staff through a view/RPC that nulls out
--       reporter_id when is_anonymous = true and the caller is 'staff', or
--   (b) enforce the masking in your API layer (Next.js server route /
--       Edge Function) and never expose the raw table to Staff directly.
-- Option (a) is recommended — see the example view below.

create view staff_reports_view as
select
  r.*,
  case
    when r.is_anonymous and current_profile_role() = 'staff' then null
    else r.reporter_id
  end as visible_reporter_id
from reports r;

-- ---- report_bully_details / report_conflict_details / report_evidence / report_followups ----
-- Inherit access from the parent report: reporter can see their own,
-- staff/admin can see all (subject to the identity-masking note above).

create policy "Access bully details via parent report"
  on report_bully_details for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_bully_details.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

create policy "Reporter can insert bully details on their own report"
  on report_bully_details for insert
  with check (
    exists (select 1 from reports r where r.id = report_bully_details.report_id and r.reporter_id = auth.uid())
  );

create policy "Access conflict details via parent report"
  on report_conflict_details for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_conflict_details.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

create policy "Reporter can insert conflict details on their own report"
  on report_conflict_details for insert
  with check (
    exists (select 1 from reports r where r.id = report_conflict_details.report_id and r.reporter_id = auth.uid())
  );

create policy "Access evidence via parent report"
  on report_evidence for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_evidence.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

create policy "Reporter can insert evidence on their own report"
  on report_evidence for insert
  with check (
    exists (select 1 from reports r where r.id = report_evidence.report_id and r.reporter_id = auth.uid())
  );

create policy "Access followups via parent report"
  on report_followups for select
  using (
    exists (
      select 1 from reports r
      where r.id = report_followups.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

create policy "Reporter or staff/admin can add followups"
  on report_followups for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from reports r
      where r.id = report_followups.report_id
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

-- ---- ai_assessments ----
create policy "Staff/Admin can view AI assessments"
  on ai_assessments for select
  using (current_profile_role() in ('staff', 'admin'));

create policy "Reporter can view AI recommendation on their own report"
  on ai_assessments for select
  using (
    exists (
      select 1 from reports r
      where r.id = ai_assessments.report_id and r.reporter_id = auth.uid()
    )
  );

-- Inserts into ai_assessments should come only from the server-side
-- AI Edge Function using the service_role key (which bypasses RLS) —
-- no client-facing insert policy is defined here on purpose.

-- ---- identity_disclosure_log ----
create policy "Only Admin can view the disclosure log"
  on identity_disclosure_log for select
  using (current_profile_role() = 'admin');

-- Inserts should come from server-side code (service_role) whenever
-- a disclosure event happens, not directly from client sessions.

-- ---- notifications ----
create policy "Recipients can view their own notifications"
  on notifications for select
  using (recipient_id = auth.uid());

-- Inserts should come from server-side code (service_role) whenever a
-- notification is generated, not directly from client sessions.

-- =========================================================
-- 14. Storage: private evidence bucket (not part of the original migration)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('report_evidence', 'report_evidence', false)
on conflict (id) do nothing;

-- Storage object paths are expected as `{report_id}/{filename}`.
create policy "Reporter can upload evidence for their own report"
  on storage.objects for insert
  with check (
    bucket_id = 'report_evidence'
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.reporter_id = auth.uid()
    )
  );

create policy "Reporter or staff/admin can read evidence for a visible report"
  on storage.objects for select
  using (
    bucket_id = 'report_evidence'
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and (r.reporter_id = auth.uid() or current_profile_role() in ('staff', 'admin'))
    )
  );

-- =========================================================
-- End of migration
-- =========================================================
