-- 132_heart_shop_disciple_germany_spain_backgrounds_2_2.sql
-- Adds three shared profile backgrounds.
--
-- Approved catalog:
-- - shared_background_17: 나는 예수님의 13번째 제자, 100 Hearts
-- - shared_background_18: 독일, free
-- - shared_background_19: 스페인, free
--
-- Display order intent:
-- - Disciple background first
-- - Existing Photo with Jesus background second
-- - Germany / Spain / Japan follow
--
-- Safety scope:
-- - Catalog rows and background sort order only.
-- - Reuses existing purchase/free-apply/toggle RPCs and RLS.
-- - Does not change Bible Reflection, streak, progress, reward maps, groups,
--   companions, challenges, or profile avatar permissions.

begin;

-- Keep the two faith-themed backgrounds at the top of the background catalog.
update public.heart_shop_items
set sort_order = case item_key
  when 'shared_background_15' then 894
  when 'shared_background_16' then 899
  else sort_order
end,
updated_at = now()
where item_key in ('shared_background_15', 'shared_background_16');

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
  ('shared_background_17', 'character', 100, '/images/heart-shop/character/shared/profile-backgrounds/background-17.webp?v=20260822_v1', null, 1, 'ground', 893, true, 'shared', 'background', now()),
  ('shared_background_18', 'character',   0, '/images/heart-shop/character/shared/profile-backgrounds/background-18.webp?v=20260822_v1', null, 1, 'ground', 897, true, 'shared', 'background', now()),
  ('shared_background_19', 'character',   0, '/images/heart-shop/character/shared/profile-backgrounds/background-19.webp?v=20260822_v1', null, 1, 'ground', 898, true, 'shared', 'background', now())
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

-- Expected: three new active backgrounds with approved prices and ordering.
select
  item_key,
  price,
  preview_path,
  sort_order,
  active,
  avatar_type,
  character_slot
from public.heart_shop_items
where item_key in (
  'shared_background_15',
  'shared_background_16',
  'shared_background_17',
  'shared_background_18',
  'shared_background_19'
)
order by sort_order, item_key;
