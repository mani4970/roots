-- Roots 2.1 general push notification defaults
--
-- Purpose:
-- - Keep every explicit push OFF choice unchanged.
-- - Make existing users who never selected a push preference default ON.
-- - The app creates the same ON defaults for new signed-in users.
--
-- Safety:
-- - Existing notification preference rows are never updated.
-- - In particular, rows with push_enabled = false remain false.
-- - No push token, notification row, reflection record, progress, streak,
--   reward, badge, challenge, prayer, or sharing record is changed.

begin;

-- Users who never opened or saved push settings have no preference row.
-- Insert only missing rows so the existing table defaults become their
-- initial ON choice.
insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
where not exists (
  select 1
  from public.notification_preferences np
  where np.user_id = p.id
)
on conflict (user_id) do nothing;

commit;

-- Verification:
-- - every profile has exactly one notification_preferences row
-- - explicit OFF rows remain OFF
select
  count(*) filter (where np.push_enabled is true) as push_on_count,
  count(*) filter (where np.push_enabled is false) as push_off_count,
  count(*) as preference_count,
  (select count(*) from public.profiles) as profile_count
from public.notification_preferences np;
