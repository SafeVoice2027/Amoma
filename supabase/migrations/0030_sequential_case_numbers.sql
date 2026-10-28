-- =========================================================
-- Amoma — Sequential report / case numbers
-- File: supabase/migrations/0030_sequential_case_numbers.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Report numbers used to be derived from a slice of the report's random UUID
-- (four digits), which isn't unique — two reports could share a number once a
-- school filed a hundred or so in a year. Each report now gets a real counter:
-- AM-<year>-<0001, 0002, ...>, restarting every January and counted per
-- school, assigned by a trigger at insert time (so it can never repeat, even
-- with several reports arriving at once).
--
-- Existing reports are numbered in the order they were filed, so their
-- numbers CHANGE once, here. Run this BEFORE deploying the matching app code.
-- =========================================================

alter table reports
  add column if not exists case_year int,
  add column if not exists case_seq int;

-- One counter row per (school, year). Only the trigger function below touches
-- it (security definer), so RLS is on with no policies.
create table if not exists report_number_counters (
  school_key uuid not null,
  year int not null,
  last_number int not null default 0,
  primary key (school_key, year)
);
alter table report_number_counters enable row level security;

-- --- Backfill existing reports, oldest first ---------------------------------

with numbered as (
  select
    id,
    extract(year from created_at)::int as y,
    row_number() over (
      partition by coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), extract(year from created_at)
      order by created_at, id
    )::int as rn
  from reports
  where case_seq is null
)
update reports r
set case_year = n.y, case_seq = n.rn
from numbered n
where r.id = n.id;

insert into report_number_counters (school_key, year, last_number)
select coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), case_year, max(case_seq)
from reports
where case_seq is not null
group by 1, 2
on conflict (school_key, year)
do update set last_number = greatest(excluded.last_number, report_number_counters.last_number);

create unique index if not exists uq_reports_case_number
  on reports (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), case_year, case_seq);

-- --- Number every new report -------------------------------------------------

create or replace function assign_report_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from new.created_at)::int;
  v_key uuid := coalesce(new.school_id, '00000000-0000-0000-0000-000000000000'::uuid);
  v_next int;
begin
  -- The upsert takes a row lock, so two simultaneous reports queue up and get
  -- consecutive numbers instead of colliding.
  insert into report_number_counters (school_key, year, last_number)
  values (v_key, v_year, 1)
  on conflict (school_key, year)
  do update set last_number = report_number_counters.last_number + 1
  returning last_number into v_next;

  new.case_year := v_year;
  new.case_seq := v_next;
  return new;
end;
$$;

drop trigger if exists trg_assign_report_number on reports;
create trigger trg_assign_report_number
  before insert on reports
  for each row execute function assign_report_number();

-- --- Expose the number through the views staff read --------------------------
-- staff_reports_view is `select r.*`, and Postgres freezes that column list
-- when the view is created — so it has to be rebuilt to pick up the new
-- columns. Same definition as 0004, with security_invoker kept on (0017).

drop view if exists staff_reports_view;
create view staff_reports_view as
select
  r.*,
  case
    when r.is_anonymous and current_profile_role() = 'staff' then null
    else r.reporter_id
  end as visible_reporter_id
from reports r;

alter view staff_reports_view set (security_invoker = true);
grant select on staff_reports_view to authenticated;

-- The bullying-type folder view (0025) gets the number appended as extra
-- columns so the folder lists can show it.
drop view if exists report_type_files;
create view report_type_files as
select
  r.id as report_id,
  t.bullying_type,
  r.status,
  r.severity,
  r.created_at,
  r.school_id,
  r.case_year,
  r.case_seq
from reports r
join report_bully_details d on d.report_id = r.id
cross join lateral unnest(d.bullying_types) as t(bullying_type);

alter view report_type_files set (security_invoker = true);
grant select on report_type_files to authenticated;

-- =========================================================
-- End of migration
-- =========================================================
