-- 136_heart_shop_busan_background_2_2.sql
-- Adds one shared, free Busan profile background.
--
-- Approved catalog:
-- - shared_background_20: 부산, free
--
-- Display order intent:
-- - shared_background_15: 예수님과 사진 찍기, always first
-- - shared_background_20: 부산, second
-- - shared_background_17: 나는 예수님의 13번째 제자, follows unchanged
--
-- Safety scope:
-- - Catalog row and background sort order only.
-- - Reuses the existing free-apply/toggle RPCs and RLS.
-- - Does not change Love Heart wallets, purchases, Bible Reflection, streak,
--   progress, reward maps, groups, companions, challenges, or profile data.

begin;

-- Stop safely if the two existing anchor backgrounds are missing or malformed.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where item_key in ('shared_background_15', 'shared_background_17')
      and category = 'character'
      and avatar_type = 'shared'
      and character_slot = 'background'
  ) <> 2 then
    raise exception 'Expected existing Jesus photo and 13th disciple backgrounds';
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
values (
  'shared_background_20',
  'character',
  0,
  '/images/heart-shop/character/shared/profile-backgrounds/background-20.webp?v=20260828_busan_v1',
  null,
  1,
  'ground',
  893,
  true,
  'shared',
  'background',
  now()
)
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

-- Keep the requested first row stable: Jesus photo first, Busan second.
update public.heart_shop_items
set
  sort_order = case item_key
    when 'shared_background_15' then 892
    when 'shared_background_20' then 893
    when 'shared_background_17' then 894
    else sort_order
  end,
  updated_at = now()
where item_key in (
  'shared_background_15',
  'shared_background_20',
  'shared_background_17'
);

-- Transaction safety stop: all three rows must have the exact requested state.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where (item_key = 'shared_background_15' and price = 300 and sort_order = 892)
       or (item_key = 'shared_background_20' and price = 0 and sort_order = 893)
       or (item_key = 'shared_background_17' and price = 100 and sort_order = 894)
  ) <> 3 then
    raise exception 'Busan background catalog postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where item_key = 'shared_background_20'
      and (
        category is distinct from 'character'
        or preview_path is distinct from '/images/heart-shop/character/shared/profile-backgrounds/background-20.webp?v=20260828_busan_v1'
        or sprite_path is not null
        or frame_count is distinct from 1
        or placement_zone is distinct from 'ground'
        or active is distinct from true
        or avatar_type is distinct from 'shared'
        or character_slot is distinct from 'background'
      )
  ) then
    raise exception 'Busan background metadata postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: expected order is Jesus photo, Busan, 13th disciple.
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
  'shared_background_20',
  'shared_background_17'
)
order by sort_order, item_key;
