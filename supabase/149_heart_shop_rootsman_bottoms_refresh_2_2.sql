-- 149_heart_shop_rootsman_bottoms_refresh_2_2.sql
-- Adds Rootsman bottoms 19-22, retires bottoms 15 and 18, and groups all
-- remaining full-length trousers directly after the newest four items.
--
-- Approved catalog:
-- - rootsman_bottom_19 through rootsman_bottom_22: 40 Love Hearts each.
-- - rootsman_bottom_15 and rootsman_bottom_18: unavailable and unequipped.
-- - Existing purchase history is preserved because heart_shop_purchases uses
--   an ON DELETE RESTRICT foreign key to heart_shop_items.
--
-- Safety scope:
-- - Reuses the existing catalog, ownership, wallet, and profile-avatar tables.
-- - Creates no table, function, sequence, policy, grant, or RLS change.
-- - Does not touch Bible Reflection progress, streaks, daily check-ins,
--   Love Heart balances/spend events, reward maps, groups, or challenges.

begin;

-- Stop safely if either retired key was unexpectedly reused for another item.
do $$
begin
  if exists (
    select 1
    from public.heart_shop_items
    where item_key in ('rootsman_bottom_15', 'rootsman_bottom_18')
      and (
        category is distinct from 'character'
        or price is distinct from 40
        or avatar_type is distinct from 'rootsman'
        or character_slot is distinct from 'bottom'
      )
  ) then
    raise exception 'A retired Rootsman bottom key has unexpected metadata';
  end if;
end
$$;

-- Force only affected character previews to regenerate on their next load.
update public.profile_avatar_preferences preference
set
  character_signature = null,
  updated_at = now()
where preference.mode = 'character'
  and (
    position('rootsman_bottom_15' in coalesce(preference.character_signature, '')) > 0
    or position('rootsman_bottom_18' in coalesce(preference.character_signature, '')) > 0
  );

-- Preserve ownership history while ensuring retired bottoms cannot remain worn.
update public.heart_shop_purchases purchase
set
  is_enabled = false,
  updated_at = now()
where purchase.item_key in ('rootsman_bottom_15', 'rootsman_bottom_18')
  and purchase.is_enabled = true;

-- Inactive rows are hidden by the existing catalog SELECT policy and rejected
-- by the existing purchase/apply RPCs.
update public.heart_shop_items item
set
  active = false,
  updated_at = now()
where item.item_key in ('rootsman_bottom_15', 'rootsman_bottom_18')
  and item.active is distinct from false;

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
  ('rootsman_bottom_19', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-19.webp?v=20260905_fw_v1', null, 1, 'ground', 1001, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_20', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-20.webp?v=20260905_fw_v1', null, 1, 'ground', 1002, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_21', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-21.webp?v=20260905_fw_v1', null, 1, 'ground', 1003, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_22', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-22.webp?v=20260905_fw_v1', null, 1, 'ground', 1004, true, 'rootsman', 'bottom', now())
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

-- Newest four -> existing full-length trousers -> shorts.
update public.heart_shop_items item
set
  sort_order = case item.item_key
    when 'rootsman_bottom_19' then 1001
    when 'rootsman_bottom_20' then 1002
    when 'rootsman_bottom_21' then 1003
    when 'rootsman_bottom_22' then 1004
    when 'rootsman_bottom_04' then 1005
    when 'rootsman_bottom_05' then 1006
    when 'rootsman_bottom_06' then 1007
    when 'rootsman_bottom_07' then 1008
    when 'rootsman_bottom_09' then 1009
    when 'rootsman_bottom_10' then 1010
    when 'rootsman_bottom_12' then 1011
    when 'rootsman_bottom_14' then 1012
    when 'rootsman_bottom_16' then 1013
    when 'rootsman_bottom_17' then 1014
    when 'rootsman_bottom_01' then 1015
    when 'rootsman_bottom_02' then 1016
    when 'rootsman_bottom_03' then 1017
    when 'rootsman_bottom_08' then 1018
    when 'rootsman_bottom_11' then 1019
    when 'rootsman_bottom_13' then 1020
  end,
  updated_at = now()
where item.item_key in (
  'rootsman_bottom_19', 'rootsman_bottom_20', 'rootsman_bottom_21', 'rootsman_bottom_22',
  'rootsman_bottom_04', 'rootsman_bottom_05', 'rootsman_bottom_06', 'rootsman_bottom_07',
  'rootsman_bottom_09', 'rootsman_bottom_10', 'rootsman_bottom_12', 'rootsman_bottom_14',
  'rootsman_bottom_16', 'rootsman_bottom_17',
  'rootsman_bottom_01', 'rootsman_bottom_02', 'rootsman_bottom_03',
  'rootsman_bottom_08', 'rootsman_bottom_11', 'rootsman_bottom_13'
);

-- Transaction safety stop: new catalog, retirement, and order must all match.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where item_key in (
      'rootsman_bottom_19',
      'rootsman_bottom_20',
      'rootsman_bottom_21',
      'rootsman_bottom_22'
    )
      and category = 'character'
      and price = 40
      and preview_path = '/images/heart-shop/character/rootsman/bottoms/'
        || replace(item_key, 'rootsman_bottom_', 'bottom-') || '.webp?v=20260905_fw_v1'
      and sprite_path is null
      and frame_count = 1
      and placement_zone = 'ground'
      and active = true
      and avatar_type = 'rootsman'
      and character_slot = 'bottom'
  ) <> 4 then
    raise exception 'New Rootsman bottom catalog postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where item_key in ('rootsman_bottom_15', 'rootsman_bottom_18')
      and active = true
  ) then
    raise exception 'A retired Rootsman bottom remains active';
  end if;

  if exists (
    select 1
    from public.heart_shop_purchases
    where item_key in ('rootsman_bottom_15', 'rootsman_bottom_18')
      and is_enabled = true
  ) then
    raise exception 'A retired Rootsman bottom remains enabled';
  end if;

  if exists (
    select 1
    from public.profile_avatar_preferences
    where mode = 'character'
      and (
        position('rootsman_bottom_15' in coalesce(character_signature, '')) > 0
        or position('rootsman_bottom_18' in coalesce(character_signature, '')) > 0
      )
  ) then
    raise exception 'A retired Rootsman bottom remains in a character signature';
  end if;

  if (
    select array_agg(item_key order by sort_order, item_key)
    from public.heart_shop_items
    where avatar_type = 'rootsman'
      and character_slot = 'bottom'
      and active = true
  ) is distinct from array[
    'rootsman_bottom_19', 'rootsman_bottom_20', 'rootsman_bottom_21', 'rootsman_bottom_22',
    'rootsman_bottom_04', 'rootsman_bottom_05', 'rootsman_bottom_06', 'rootsman_bottom_07',
    'rootsman_bottom_09', 'rootsman_bottom_10', 'rootsman_bottom_12', 'rootsman_bottom_14',
    'rootsman_bottom_16', 'rootsman_bottom_17',
    'rootsman_bottom_01', 'rootsman_bottom_02', 'rootsman_bottom_03',
    'rootsman_bottom_08', 'rootsman_bottom_11', 'rootsman_bottom_13'
  ]::text[] then
    raise exception 'Rootsman bottom display order postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: retired items are inactive; active items use final order.
select
  item_key,
  price,
  sort_order,
  active,
  preview_path
from public.heart_shop_items
where avatar_type = 'rootsman'
  and character_slot = 'bottom'
order by active desc, sort_order, item_key;

select count(*) as enabled_retired_rootsman_bottom_count
from public.heart_shop_purchases
where item_key in ('rootsman_bottom_15', 'rootsman_bottom_18')
  and is_enabled = true;
