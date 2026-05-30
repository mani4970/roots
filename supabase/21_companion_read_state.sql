-- Roots 1.3: faith partner shared-content read state
-- Purpose:
-- - Track when each user last opened a faith partner detail page.
-- - Used to show a "new" badge on partner cards when a partner has shared a new reflection or prayer since then.
--
-- Safe scope:
-- - Adds one nullable timestamp column to companion_preferences.
-- - Does not change existing companion relationships or shared content.
-- - Existing RLS policies on companion_preferences continue to apply.

alter table public.companion_preferences
add column if not exists last_seen_shared_at timestamptz;

create index if not exists companion_preferences_user_seen_idx
on public.companion_preferences(user_id, companion_user_id, last_seen_shared_at desc);

grant select, insert, update, delete on public.companion_preferences to authenticated;
grant select, insert, update, delete on public.companion_preferences to service_role;
