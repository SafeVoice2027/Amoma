-- =========================================================
-- Amoma — Refresh staff_reports_view to expose `category`
-- File: supabase/migrations/0004_refresh_staff_reports_view.sql
-- =========================================================
-- Run via: supabase migration up
-- (or paste into the Supabase SQL editor)
--
-- staff_reports_view (0001_init_schema.sql) is defined as `select r.*, ...`.
-- Postgres freezes a view's column list at CREATE VIEW time, so it never
-- picked up the `category` column added later by
-- 0002_add_report_category.sql — the view still doesn't expose it, even
-- though `reports.category` itself exists and is being written to. Adding a
-- new column via `r.*` also can't be done with CREATE OR REPLACE VIEW here,
-- since `category` would land in the middle of the output list (before
-- visible_reporter_id), not at the end — Postgres only allows appending new
-- columns at the very end. Dropping and recreating is safe: it's just a
-- view, no data to lose.
-- =========================================================

drop view if exists staff_reports_view;

create view staff_reports_view as
select
  r.*,
  case
    when r.is_anonymous and current_profile_role() = 'staff' then null
    else r.reporter_id
  end as visible_reporter_id
from reports r;

-- =========================================================
-- End of migration
-- =========================================================
