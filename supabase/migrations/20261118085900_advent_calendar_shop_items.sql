-- Event rewards use normal ownership records and remain outside the sale catalog.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

insert into public.heart_shop_items (
  item_key, category, price, preview_path, frame_count, placement_zone,
  sort_order, active, avatar_type, character_slot
)
select reward.item_key, 'character', 0,
       '/images/seasonal/advent-2026/' || reward.file_name,
       1, 'ground', 15000, false, reward.avatar_type, reward.slot
from (values
  ('advent_2026_sheep', 'sheep.webp', 'shared', 'pet'),
  ('advent_2026_red_scarf_rootsman', 'wardrobe/rootsman-red-plaid-scarf.webp', 'rootsman', 'muffler'),
  ('advent_2026_red_scarf_rootswoman', 'wardrobe/rootswoman-red-plaid-scarf.webp', 'rootswoman', 'muffler'),
  ('advent_2026_bethlehem', 'bethlehem.webp', 'shared', 'background'),
  ('advent_2026_cream_knit_rootsman', 'wardrobe/rootsman-christmas-knit.webp', 'rootsman', 'top'),
  ('advent_2026_cream_knit_rootswoman', 'wardrobe/rootswoman-christmas-knit.webp', 'rootswoman', 'top'),
  ('advent_2026_tree', 'tree.webp', 'shared', 'pet'),
  ('advent_2026_hat_rootsman', 'wardrobe/rootsman-christmas-beret.webp', 'rootsman', 'headwear'),
  ('advent_2026_hat_rootswoman', 'wardrobe/rootswoman-snowflake-hat.webp', 'rootswoman', 'headwear'),
  ('advent_2026_cream_scarf_rootsman', 'wardrobe/rootsman-cream-knit-scarf.webp', 'rootsman', 'muffler'),
  ('advent_2026_cream_scarf_rootswoman', 'wardrobe/rootswoman-cream-knit-scarf.webp', 'rootswoman', 'muffler'),
  ('advent_2026_church', 'church.webp', 'shared', 'background'),
  ('advent_2026_cardigan_rootsman', 'wardrobe/rootsman-christmas-cardigan.webp', 'rootsman', 'top'),
  ('advent_2026_cardigan_rootswoman', 'wardrobe/rootswoman-christmas-cardigan.webp', 'rootswoman', 'top'),
  ('advent_2026_snowman', 'snowman.webp', 'shared', 'pet'),
  ('advent_2026_home', 'home.webp', 'shared', 'background')
) as reward(item_key, file_name, avatar_type, slot)
on conflict (item_key) do update
set price = excluded.price,
    preview_path = excluded.preview_path,
    active = false,
    avatar_type = excluded.avatar_type,
    character_slot = excluded.character_slot,
    updated_at = now();

create schema if not exists roots_advent_shop_private;
revoke all on schema roots_advent_shop_private from public, anon, authenticated, service_role;
grant usage on schema roots_advent_shop_private to authenticated;

-- Existing purchase, gifting and free-background RPCs only accept active items.
-- This isolated toggle accepts an inactive Advent item only for its actual owner.
create or replace function roots_advent_shop_private.set_owned_item_enabled(
  p_item_key text, p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.heart_shop_items%rowtype;
  v_avatar_type text;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_enabled is null then
    return jsonb_build_object('updated', false, 'reason', 'invalid_enabled_value', 'item_key', p_item_key);
  end if;

  -- Serialize with normal Love Shop purchases and slot changes.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select item.*
  into v_item
  from public.heart_shop_items item
  join public.heart_shop_purchases purchase
    on purchase.item_key = item.item_key and purchase.user_id = v_user_id
  where item.item_key = p_item_key
    and starts_with(item.item_key, 'advent_2026_')
    and item.category = 'character'
    and item.active = false;
  if not found then
    return jsonb_build_object('updated', false, 'reason', 'not_owned', 'item_key', p_item_key);
  end if;

  if p_enabled and v_item.avatar_type <> 'shared' then
    select profile.avatar_type into v_avatar_type
    from public.profiles profile
    where profile.id = v_user_id;
    if v_avatar_type is distinct from v_item.avatar_type then
      return jsonb_build_object(
        'updated', false, 'reason', 'incompatible_avatar', 'item_key', p_item_key, 'is_enabled', false
      );
    end if;
  end if;

  if p_enabled then
    update public.heart_shop_purchases purchase
    set is_enabled = false, updated_at = now()
    from public.heart_shop_items owned_item
    where purchase.user_id = v_user_id
      and purchase.is_enabled
      and owned_item.item_key = purchase.item_key
      and owned_item.item_key <> v_item.item_key
      and owned_item.category = 'character'
      and owned_item.avatar_type = v_item.avatar_type
      and owned_item.character_slot = v_item.character_slot;
  end if;

  update public.heart_shop_purchases purchase
  set is_enabled = p_enabled, updated_at = now()
  where purchase.user_id = v_user_id and purchase.item_key = v_item.item_key;
  if not found then
    return jsonb_build_object('updated', false, 'reason', 'not_owned', 'item_key', p_item_key);
  end if;

  return jsonb_build_object(
    'updated', true, 'reason', 'updated', 'item_key', v_item.item_key, 'is_enabled', p_enabled
  );
end;
$$;

create or replace function public.advent_2026_set_owned_item_enabled(
  p_item_key text, p_enabled boolean
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select roots_advent_shop_private.set_owned_item_enabled(p_item_key, p_enabled);
$$;

revoke all on function roots_advent_shop_private.set_owned_item_enabled(text, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.advent_2026_set_owned_item_enabled(text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function roots_advent_shop_private.set_owned_item_enabled(text, boolean) to authenticated;
grant execute on function public.advent_2026_set_owned_item_enabled(text, boolean) to authenticated;

commit;
