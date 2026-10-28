-- =========================================================
-- Amoma — School-wide resolution rate for the student home
-- File: supabase/migrations/0032_school_resolution_stats.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- The student home shows "All reports at your school" next to the student's
-- own resolution rate. A student can't read other students' reports (RLS), so
-- this SECURITY DEFINER function does the counting and hands back only totals
-- for the caller's own school — never a single row or report.
--
-- Privacy: with only a handful of reports in a school, even totals can give
-- something away ("1 of 2 resolved"). So the numbers are withheld until the
-- school has at least 10 reports; below that, `enough` is false and every count
-- comes back NULL. The threshold lives here so no client can bypass it.
-- =========================================================

create or replace function get_school_resolution_stats()
returns table (
  enough boolean,
  total_reports int,
  resolved_count int,
  in_process_count int,
  unresolved_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_total int;
  v_resolved int;
  v_in_process int;
  v_unresolved int;
begin
  select school_id into v_school from profiles where id = auth.uid();

  if v_school is null then
    return query select false, null::int, null::int, null::int, null::int;
    return;
  end if;

  select
    count(*)::int,
    (count(*) filter (where status = 'resolved'))::int,
    (count(*) filter (where status = 'in_process'))::int,
    (count(*) filter (where status = 'unresolved'))::int
  into v_total, v_resolved, v_in_process, v_unresolved
  from reports
  where school_id = v_school;

  if v_total < 10 then
    return query select false, null::int, null::int, null::int, null::int;
  else
    return query select true, v_total, v_resolved, v_in_process, v_unresolved;
  end if;
end;
$$;

grant execute on function get_school_resolution_stats() to authenticated;

-- =========================================================
-- End of migration
-- =========================================================
