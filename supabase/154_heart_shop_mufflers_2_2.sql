-- 154_heart_shop_mufflers_2_2.sql
-- Adds four Rootsman and four Rootswoman mufflers to the Love Shop.
--
-- Approved catalog:
-- - rootsman_muffler_01..04: 30 Love Hearts each
-- - rootswoman_muffler_01..04: 30 Love Hearts each
-- - Dedicated exclusive character slot: muffler
-- - All assets are transparent WebP layers on the existing 1086x1448 character canvas.
--
-- Safety scope:
-- - Extends only the existing character_slot check with 'muffler'.
-- - Reuses the existing heart_shop_items table, RLS policies, purchase/toggle RPCs,
--   wallet lock, duplicate purchase guard, and spend ledger.
-- - Does not modify existing purchases, wallets, profiles, QT/streak/progress,
--   badges, reward maps, prayer data, companion challenges, or group challenges.
-- - Duplicate-safe upsert; safe to rerun after code/assets are deployed.

begin;

alter table public.heart_shop_items
  drop constraint if exists heart_shop_items_character_slot_check,
  add constraint heart_shop_items_character_slot_check
    check (
      character_slot is null
      or character_slot in (
        'background',
        'bottom',
        'shoes',
        'top',
        'bag',
        'eyewear',
        'hair',
        'hair_accessory',
        'muffler',
        'headwear',
        'pet'
      )
    );

do $$
begin
  if exists (
    select 1
    from public.heart_shop_items
    where item_key in (
      'rootsman_muffler_01',
      'rootsman_muffler_02',
      'rootsman_muffler_03',
      'rootsman_muffler_04',
      'rootswoman_muffler_01',
      'rootswoman_muffler_02',
      'rootswoman_muffler_03',
      'rootswoman_muffler_04'
    )
      and (
        category is distinct from 'character'
        or avatar_type not in ('rootsman', 'rootswoman')
        or character_slot is distinct from 'muffler'
      )
  ) then
    raise exception 'A muffler item key is already used by incompatible catalog metadata';
  end if;
end
$$;

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
  ('rootsman_muffler_01', 'character', 30, '/images/heart-shop/character/rootsman/mufflers/muffler-01.webp?v=20261005_v1', null, 1, 'ground', 1701, true, 'rootsman', 'muffler', now()),
  ('rootsman_muffler_02', 'character', 30, '/images/heart-shop/character/rootsman/mufflers/muffler-02.webp?v=20261005_v1', null, 1, 'ground', 1702, true, 'rootsman', 'muffler', now()),
  ('rootsman_muffler_03', 'character', 30, '/images/heart-shop/character/rootsman/mufflers/muffler-03.webp?v=20261005_v1', null, 1, 'ground', 1703, true, 'rootsman', 'muffler', now()),
  ('rootsman_muffler_04', 'character', 30, '/images/heart-shop/character/rootsman/mufflers/muffler-04.webp?v=20261005_v1', null, 1, 'ground', 1704, true, 'rootsman', 'muffler', now()),
  ('rootswoman_muffler_01', 'character', 30, '/images/heart-shop/character/rootswoman/mufflers/muffler-01.webp?v=20261005_v1', null, 1, 'ground', 2701, true, 'rootswoman', 'muffler', now()),
  ('rootswoman_muffler_02', 'character', 30, '/images/heart-shop/character/rootswoman/mufflers/muffler-02.webp?v=20261005_v1', null, 1, 'ground', 2702, true, 'rootswoman', 'muffler', now()),
  ('rootswoman_muffler_03', 'character', 30, '/images/heart-shop/character/rootswoman/mufflers/muffler-03.webp?v=20261005_v1', null, 1, 'ground', 2703, true, 'rootswoman', 'muffler', now()),
  ('rootswoman_muffler_04', 'character', 30, '/images/heart-shop/character/rootswoman/mufflers/muffler-04.webp?v=20261005_v1', null, 1, 'ground', 2704, true, 'rootswoman', 'muffler', now())
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

do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where item_key in (
      'rootsman_muffler_01',
      'rootsman_muffler_02',
      'rootsman_muffler_03',
      'rootsman_muffler_04',
      'rootswoman_muffler_01',
      'rootswoman_muffler_02',
      'rootswoman_muffler_03',
      'rootswoman_muffler_04'
    )
      and category = 'character'
      and price = 30
      and active is true
      and character_slot = 'muffler'
      and sprite_path is null
      and frame_count = 1
      and placement_zone = 'ground'
      and lower(split_part(preview_path, '?', 1)) like '%.webp'
  ) <> 8 then
    raise exception 'Muffler catalog postcondition failed';
  end if;

  if (
    select count(*)
    from public.heart_shop_items
    where item_key like 'rootsman_muffler_%'
      and avatar_type = 'rootsman'
      and sort_order between 1701 and 1704
  ) <> 4 then
    raise exception 'Rootsman muffler metadata postcondition failed';
  end if;

  if (
    select count(*)
    from public.heart_shop_items
    where item_key like 'rootswoman_muffler_%'
      and avatar_type = 'rootswoman'
      and sort_order between 2701 and 2704
  ) <> 4 then
    raise exception 'Rootswoman muffler metadata postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: expected eight active 30-heart WebP mufflers.
select item_key, price, preview_path, sort_order, active, avatar_type, character_slot
from public.heart_shop_items
where item_key in (
  'rootsman_muffler_01',
  'rootsman_muffler_02',
  'rootsman_muffler_03',
  'rootsman_muffler_04',
  'rootswoman_muffler_01',
  'rootswoman_muffler_02',
  'rootswoman_muffler_03',
  'rootswoman_muffler_04'
)
order by avatar_type, sort_order;
