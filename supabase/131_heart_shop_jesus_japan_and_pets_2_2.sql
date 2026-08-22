-- 131_heart_shop_jesus_japan_and_pets_2_2.sql
-- Adds two shared profile backgrounds and three shared profile pets.
--
-- Approved catalog:
-- - shared_background_15: 예수님과 사진 찍기, 300 Hearts
-- - shared_background_16: 일본, free
-- - shared_pet_05: 동키, 150 Hearts
-- - shared_pet_06: 치치, 150 Hearts
-- - shared_pet_07: 열무, 100 Hearts
--
-- Safety scope:
-- - Catalog rows only. Reuses existing purchase/free-apply/toggle RPCs and RLS.
-- - Does not change Bible Reflection, streak, progress, reward maps, groups, companions, or challenges.

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
  ('shared_background_15', 'character', 300, '/images/heart-shop/character/shared/profile-backgrounds/background-15.webp?v=20260822_v1', null, 1, 'ground', 895, true, 'shared', 'background', now()),
  ('shared_background_16', 'character',   0, '/images/heart-shop/character/shared/profile-backgrounds/background-16.webp?v=20260822_v1', null, 1, 'ground', 896, true, 'shared', 'background', now()),
  ('shared_pet_05',        'character', 150, '/images/heart-shop/character/shared/pets/pet-05.webp', null, 1, 'ground', 805, true, 'shared', 'pet', now()),
  ('shared_pet_06',        'character', 150, '/images/heart-shop/character/shared/pets/pet-06.webp', null, 1, 'ground', 806, true, 'shared', 'pet', now()),
  ('shared_pet_07',        'character', 100, '/images/heart-shop/character/shared/pets/pet-07.webp', null, 1, 'sky',    807, true, 'shared', 'pet', now())
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

-- Expected: exactly 5 new active catalog rows with the approved prices.
select
  item_key,
  price,
  preview_path,
  placement_zone,
  sort_order,
  active,
  avatar_type,
  character_slot
from public.heart_shop_items
where item_key in (
  'shared_background_15',
  'shared_background_16',
  'shared_pet_05',
  'shared_pet_06',
  'shared_pet_07'
)
order by item_key;
