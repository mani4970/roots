-- 144_heart_shop_new_travel_backgrounds_2_2.sql
-- Adds four shared, free profile backgrounds to the Love Shop.
--
-- Approved catalog:
-- - shared_background_21: Hollywood, free
-- - shared_background_22: Jeju Island, free
-- - shared_background_23: Norway Aurora, free
-- - shared_background_24: Swiss Winter Village, free
--
-- Display order intent:
-- - shared_background_15: Photo with Jesus, always first
-- - shared_background_21..24: the four newest backgrounds, immediately after
--
-- Safety scope:
-- - Catalog rows and background sort order only.
-- - Reuses the existing free-apply/toggle RPCs and RLS.
-- - Does not change Love Heart wallets, purchases, Bible Reflection, streak,
--   progress, reward maps, groups, companions, challenges, or profile data.

begin;

-- Stop safely if the existing top anchor is missing or malformed.
do $$
begin
  if not exists (
    select 1
    from public.heart_shop_items
    where item_key = 'shared_background_15'
      and category = 'character'
      and price = 300
      and active = true
      and avatar_type = 'shared'
      and character_slot = 'background'
  ) then
    raise exception 'Expected existing Photo with Jesus background';
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
  ('shared_background_21', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-21.webp?v=20260904_travel_v1', null, 1, 'ground', 881, true, 'shared', 'background', now()),
  ('shared_background_22', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-22.webp?v=20260904_travel_v1', null, 1, 'ground', 882, true, 'shared', 'background', now()),
  ('shared_background_23', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-23.webp?v=20260904_travel_v1', null, 1, 'ground', 883, true, 'shared', 'background', now()),
  ('shared_background_24', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-24.webp?v=20260904_travel_v1', null, 1, 'ground', 884, true, 'shared', 'background', now())
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

-- Keep Photo with Jesus above every new and existing background.
update public.heart_shop_items
set
  sort_order = 880,
  updated_at = now()
where item_key = 'shared_background_15'
  and sort_order is distinct from 880;

-- Transaction safety stop: all five rows must have the exact requested state.
do $$
begin
  if exists (
    select 1
    from (
      values
        ('shared_background_15'::text, 300, 880, null::text),
        ('shared_background_21'::text,   0, 881, '/images/heart-shop/character/shared/profile-backgrounds/background-21.webp?v=20260904_travel_v1'::text),
        ('shared_background_22'::text,   0, 882, '/images/heart-shop/character/shared/profile-backgrounds/background-22.webp?v=20260904_travel_v1'::text),
        ('shared_background_23'::text,   0, 883, '/images/heart-shop/character/shared/profile-backgrounds/background-23.webp?v=20260904_travel_v1'::text),
        ('shared_background_24'::text,   0, 884, '/images/heart-shop/character/shared/profile-backgrounds/background-24.webp?v=20260904_travel_v1'::text)
    ) as expected(item_key, price, sort_order, preview_path)
    left join public.heart_shop_items item
      on item.item_key = expected.item_key
    where item.item_key is null
       or item.category is distinct from 'character'
       or item.price is distinct from expected.price
       or item.sort_order is distinct from expected.sort_order
       or (
         expected.preview_path is not null
         and item.preview_path is distinct from expected.preview_path
       )
       or item.active is distinct from true
       or item.avatar_type is distinct from 'shared'
       or item.character_slot is distinct from 'background'
       or (
         expected.item_key <> 'shared_background_15'
         and (
           item.sprite_path is not null
           or item.frame_count is distinct from 1
           or item.placement_zone is distinct from 'ground'
         )
       )
  ) then
    raise exception 'New profile background catalog postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where category = 'character'
      and avatar_type = 'shared'
      and character_slot = 'background'
      and active = true
      and item_key <> 'shared_background_15'
      and sort_order <= 880
  ) then
    raise exception 'Photo with Jesus must remain the first active profile background';
  end if;
end
$$;

commit;

-- Read-only postcheck: Jesus first, followed by the four new free backgrounds.
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
  'shared_background_21',
  'shared_background_22',
  'shared_background_23',
  'shared_background_24'
)
order by sort_order, item_key;
