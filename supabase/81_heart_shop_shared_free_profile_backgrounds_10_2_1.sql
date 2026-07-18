-- 81_heart_shop_shared_free_profile_backgrounds_10_2_1.sql
-- Replaces the six shared background images and extends the free set to ten.
-- Run after 80_heart_shop_shared_free_profile_backgrounds_2_1.sql.
--
-- Safety scope:
-- - Reuses the existing catalog, ownership records, RLS policies, and RPCs.
-- - Does not change Love Heart balances, purchases, reflection progress,
--   streaks, profiles, badges, reward maps, or challenge data.

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
  ('shared_background_01', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-01.png?v=20260718_v2', null, 1, 'ground', 901, true, 'shared', 'background', now()),
  ('shared_background_02', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-02.png?v=20260718_v2', null, 1, 'ground', 902, true, 'shared', 'background', now()),
  ('shared_background_03', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-03.png?v=20260718_v2', null, 1, 'ground', 903, true, 'shared', 'background', now()),
  ('shared_background_04', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-04.png?v=20260718_v2', null, 1, 'ground', 904, true, 'shared', 'background', now()),
  ('shared_background_05', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-05.png?v=20260718_v2', null, 1, 'ground', 905, true, 'shared', 'background', now()),
  ('shared_background_06', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-06.png?v=20260718_v2', null, 1, 'ground', 906, true, 'shared', 'background', now()),
  ('shared_background_07', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-07.png?v=20260718_v2', null, 1, 'ground', 907, true, 'shared', 'background', now()),
  ('shared_background_08', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-08.png?v=20260718_v2', null, 1, 'ground', 908, true, 'shared', 'background', now()),
  ('shared_background_09', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-09.png?v=20260718_v2', null, 1, 'ground', 909, true, 'shared', 'background', now()),
  ('shared_background_10', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-10.png?v=20260718_v2', null, 1, 'ground', 910, true, 'shared', 'background', now())
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

-- Expected result: 10 active shared backgrounds, all free, sort order 901-910.
select
  count(*) as shared_background_count,
  min(price) as min_price,
  max(price) as max_price,
  min(sort_order) as min_sort_order,
  max(sort_order) as max_sort_order,
  bool_and(active) as all_active
from public.heart_shop_items
where avatar_type = 'shared'
  and character_slot = 'background';
