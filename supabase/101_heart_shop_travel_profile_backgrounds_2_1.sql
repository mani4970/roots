-- 101_heart_shop_travel_profile_backgrounds_2_1.sql
-- Adds four shared, free travel profile backgrounds to the Love Shop.
-- Run after 81_heart_shop_shared_free_profile_backgrounds_10_2_1.sql.
--
-- Safety scope:
-- - Reuses the existing catalog, ownership records, RLS policies, and RPCs.
-- - Free backgrounds never touch Love Heart wallets or spend events.
-- - Does not change reflection progress, streaks, daily check-ins, profiles,
--   badges, reward maps, companion challenges, or group challenges.

begin;

insert into public.heart_shop_items (
  item_key,
  category,
  price,
  preview_path,
  sprite_path,
  frame_count,
  placement_zone,
  sort_order,
  active,
  avatar_type,
  character_slot,
  updated_at
)
values
  ('shared_background_11', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-11.png?v=20260726_travel_v1', null, 1, 'ground', 891, true, 'shared', 'background', now()),
  ('shared_background_12', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-12.png?v=20260726_travel_v1', null, 1, 'ground', 892, true, 'shared', 'background', now()),
  ('shared_background_13', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-13.png?v=20260726_travel_v1', null, 1, 'ground', 893, true, 'shared', 'background', now()),
  ('shared_background_14', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-14.png?v=20260726_travel_v1', null, 1, 'ground', 894, true, 'shared', 'background', now())
on conflict (item_key) do update
set
  category = excluded.category,
  price = excluded.price,
  preview_path = excluded.preview_path,
  sprite_path = excluded.sprite_path,
  frame_count = excluded.frame_count,
  placement_zone = excluded.placement_zone,
  sort_order = excluded.sort_order,
  active = excluded.active,
  avatar_type = excluded.avatar_type,
  character_slot = excluded.character_slot,
  updated_at = now();

commit;

-- Expected result: 14 active shared backgrounds, all free.
select
  count(*) as shared_background_count,
  min(price) as min_price,
  max(price) as max_price,
  bool_and(active) as all_active
from public.heart_shop_items
where avatar_type = 'shared'
  and character_slot = 'background';
