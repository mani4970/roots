-- 145_heart_shop_rootsman_fw_bottoms_2_2.sql
-- Adds four new Rootsman bottoms to the Love Shop at 40 Love Hearts each.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase/toggle RPCs, wallet lock, duplicate guard, and spend ledger.
-- - Uses duplicate-safe upserts and does not delete or deactivate existing items.
-- - Creates no new table, function, sequence, policy, or Data API grant.
-- - Does not touch Bible Reflection progress, streaks, daily check-ins, profiles,
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
  ('rootsman_bottom_15', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-15.webp?v=20260904_fw_v1', null, 1, 'ground', 1015, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_16', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-16.webp?v=20260904_fw_v1', null, 1, 'ground', 1016, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_17', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-17.webp?v=20260904_fw_v1', null, 1, 'ground', 1017, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_18', 'character', 40, '/images/heart-shop/character/rootsman/bottoms/bottom-18.webp?v=20260904_fw_v1', null, 1, 'ground', 1018, true, 'rootsman', 'bottom', now())
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

-- Stop and roll back unless all four rows match the approved catalog exactly.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where item_key in (
      'rootsman_bottom_15',
      'rootsman_bottom_16',
      'rootsman_bottom_17',
      'rootsman_bottom_18'
    )
      and price = 40
  ) <> 4 then
    raise exception 'Rootsman FW bottom price postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where item_key in (
      'rootsman_bottom_15',
      'rootsman_bottom_16',
      'rootsman_bottom_17',
      'rootsman_bottom_18'
    )
      and (
        category is distinct from 'character'
        or preview_path not like '/images/heart-shop/character/rootsman/bottoms/bottom-__.webp?v=20260904_fw_v1'
        or sprite_path is not null
        or frame_count is distinct from 1
        or placement_zone is distinct from 'ground'
        or sort_order is distinct from 1000 + right(item_key, 2)::integer
        or active is distinct from true
        or avatar_type is distinct from 'rootsman'
        or character_slot is distinct from 'bottom'
      )
  ) then
    raise exception 'Rootsman FW bottom metadata postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: all four prices must be 40.
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
  'rootsman_bottom_15',
  'rootsman_bottom_16',
  'rootsman_bottom_17',
  'rootsman_bottom_18'
)
order by sort_order;
