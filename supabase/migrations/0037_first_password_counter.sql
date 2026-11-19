-- =========================================================
-- Amoma — Keep counting first passwords across imports
-- File: supabase/migrations/0037_first_password_counter.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- New student accounts get a numbered first password (Amoma0149, Amoma0150 …).
-- schools.last_first_password_number remembers the last number given out, so
-- the next import carries on from it instead of starting again at 0001. The
-- function hands out the next number atomically (two imports at the same time
-- can never get the same one) and can only be called with the service role.
-- =========================================================

alter table schools
  add column if not exists last_first_password_number integer not null default 0;

create or replace function next_first_password_number(p_school_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update schools
     set last_first_password_number = last_first_password_number + 1
   where id = p_school_id
  returning last_first_password_number into n;
  return n;
end;
$$;

revoke all on function next_first_password_number(uuid) from public, anon, authenticated;
grant execute on function next_first_password_number(uuid) to service_role;

-- =========================================================
-- End of migration
-- =========================================================
