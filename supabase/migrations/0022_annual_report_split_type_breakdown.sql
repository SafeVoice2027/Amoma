-- =========================================================
-- Amoma — Split annual_reports' type breakdown (Bully vs. Conflict)
-- File: supabase/migrations/0022_annual_report_split_type_breakdown.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- Live diagnosis: annual_reports and generate_annual_report() were created
-- from the Filing System addendum's first pass — the one that derived its
-- "by type" breakdown only from report_type_files (Bully reports only,
-- since Conflict reports have no bullying_types row at all). That silently
-- drops every Conflict report from the annual archive's type breakdown.
-- The addendum's own Section 4 correction (rename the column, add a
-- second one, recreate the function) was never actually applied — the
-- live table still has the single `breakdown_by_type` column. This
-- migration is that correction.
-- =========================================================

alter table annual_reports rename column breakdown_by_type to breakdown_by_bullying_type;
alter table annual_reports add column if not exists breakdown_by_report_type jsonb not null default '{}';

create or replace function generate_annual_report()
returns void
language plpgsql
security definer
as $$
declare
  target_year int := extract(year from now())::int - 1;
  v_total int; v_resolved int; v_unresolved int; v_in_process int;
  v_by_report_type jsonb; v_by_bullying_type jsonb; v_by_severity jsonb; v_by_month jsonb;
  admin_id uuid;
begin
  select count(*),
         count(*) filter (where status = 'resolved'),
         count(*) filter (where status = 'unresolved'),
         count(*) filter (where status = 'in_process')
  into v_total, v_resolved, v_unresolved, v_in_process
  from reports
  where extract(year from created_at) = target_year;

  -- Bully vs. Conflict split — this is what was missing before; without it,
  -- Conflict reports vanished from the annual archive's type breakdown entirely.
  select coalesce(jsonb_object_agg(type, cnt), '{}') into v_by_report_type
  from (
    select type, count(*) as cnt
    from reports
    where extract(year from created_at) = target_year
    group by type
  ) rt;

  -- Bullying sub-type breakdown (Verbal/Cyber/Physical/Social) — Bully reports only
  select coalesce(jsonb_object_agg(bullying_type, cnt), '{}') into v_by_bullying_type
  from (
    select bullying_type, count(*) as cnt
    from report_type_files
    where extract(year from created_at) = target_year
    group by bullying_type
  ) t;

  select coalesce(jsonb_object_agg(severity, cnt), '{}') into v_by_severity
  from (
    select severity, count(*) as cnt
    from reports
    where extract(year from created_at) = target_year and severity is not null
    group by severity
  ) s;

  select coalesce(jsonb_object_agg(month, cnt), '{}') into v_by_month
  from (
    select to_char(date_trunc('month', created_at), 'Mon') as month, count(*) as cnt
    from reports
    where extract(year from created_at) = target_year
    group by 1
  ) m;

  insert into annual_reports (year, total_reports, resolved_count, unresolved_count, in_process_count, breakdown_by_report_type, breakdown_by_bullying_type, breakdown_by_severity, breakdown_by_month)
  values (target_year, v_total, v_resolved, v_unresolved, v_in_process, v_by_report_type, v_by_bullying_type, v_by_severity, v_by_month)
  on conflict (year) do nothing;

  -- Notify every Admin to print/archive the finished report
  for admin_id in select id from profiles where role = 'admin' loop
    insert into notifications (recipient_id, channel, urgency)
    values (admin_id, 'push', 'normal');
  end loop;
end;
$$;

-- =========================================================
-- End of migration
-- =========================================================
