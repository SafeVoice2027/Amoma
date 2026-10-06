-- =========================================================
-- Amoma — Let Handlers (branded "Admin") use annual reports too
-- File: supabase/migrations/0023_annual_reports_handler_access.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- The Filing System addendum gated annual_reports to
-- `current_profile_role() = 'admin'` — since the Handler/Admin/Developer
-- rebrand that DB role is "Developer" only, so Handlers (branded "Admin",
-- the people who actually print and file these) saw an empty list and
-- couldn't mark anything printed. Both now have access, and the year-end
-- notification reaches both.
-- =========================================================

drop policy if exists "Admin can view annual reports" on annual_reports;
create policy "Handler/Developer can view annual reports"
  on annual_reports for select
  using (
    current_profile_role() = 'admin'
    or exists (select 1 from profiles where id = auth.uid() and is_handler)
  );

drop policy if exists "Admin can mark a report as printed" on annual_reports;
create policy "Handler/Developer can mark a report as printed"
  on annual_reports for update
  using (
    current_profile_role() = 'admin'
    or exists (select 1 from profiles where id = auth.uid() and is_handler)
  );

create or replace function generate_annual_report()
returns void
language plpgsql
security definer
as $$
declare
  target_year int := extract(year from now())::int - 1;
  v_total int; v_resolved int; v_unresolved int; v_in_process int;
  v_by_report_type jsonb; v_by_bullying_type jsonb; v_by_severity jsonb; v_by_month jsonb;
  recipient_id uuid;
begin
  select count(*),
         count(*) filter (where status = 'resolved'),
         count(*) filter (where status = 'unresolved'),
         count(*) filter (where status = 'in_process')
  into v_total, v_resolved, v_unresolved, v_in_process
  from reports
  where extract(year from created_at) = target_year;

  select coalesce(jsonb_object_agg(type, cnt), '{}') into v_by_report_type
  from (
    select type, count(*) as cnt
    from reports
    where extract(year from created_at) = target_year
    group by type
  ) rt;

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

  -- Notify everyone who can print/archive it: Developer and Handlers.
  for recipient_id in select id from profiles where role = 'admin' or is_handler loop
    insert into notifications (recipient_id, channel, urgency)
    values (recipient_id, 'push', 'normal');
  end loop;
end;
$$;

-- =========================================================
-- End of migration
-- =========================================================
