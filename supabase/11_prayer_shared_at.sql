-- Track when a prayer request is shared to community/group visibility.
-- This lets group "new" badges use the share time instead of the original private creation time.

alter table if exists public.prayer_items
  add column if not exists shared_at timestamptz;

create index if not exists prayer_items_shared_at_idx
  on public.prayer_items(shared_at desc);

-- Backfill: existing already-shared prayers use created_at as their first share time.
update public.prayer_items
set shared_at = created_at
where shared_at is null
  and coalesce(visibility, 'private') <> 'private'
  and coalesce(visibility, '') <> '';
