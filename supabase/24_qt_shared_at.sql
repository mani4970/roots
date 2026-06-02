-- 24_qt_shared_at.sql
-- Purpose:
-- - Track when a Bible Reflection was shared to all/community or groups.
-- - This lets community/group feeds show recently shared older reflections near the top.
-- - Partner-only shares still use qt_record_recipients.created_at for partner feed ordering.

alter table if exists public.qt_records
  add column if not exists shared_at timestamptz;

create index if not exists idx_qt_records_shared_at
  on public.qt_records(shared_at desc)
  where shared_at is not null;

-- Backfill existing public/group shared reflections so current feeds keep their previous order.
update public.qt_records
set shared_at = created_at
where shared_at is null
  and visibility is not null
  and visibility <> ''
  and visibility <> 'private'
  and (
    visibility = 'all'
    or visibility like 'all,%'
    or visibility like '%,all'
    or visibility like '%,all,%'
    or visibility like 'group_%'
    or visibility like '%,group_%'
  );
