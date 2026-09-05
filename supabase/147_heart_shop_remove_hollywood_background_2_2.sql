-- 147_heart_shop_remove_hollywood_background_2_2.sql
-- Retires the shared Hollywood profile background from the Love Shop.
--
-- Safety scope:
-- - Preserves existing free-apply ownership rows for audit/history.
-- - Disables the retired background for every user and invalidates only profile
--   character signatures that still reference it, so the client can regenerate.
-- - Keeps Jeju Island, Norway Aurora, and Swiss Winter Village active and moves
--   them up one position directly after Photo with Jesus.
-- - Does not change Love Heart wallets, spend events, Bible Reflection, streak,
--   progress, reward maps, groups, companions, challenges, or unrelated profiles.

begin;

-- Stop safely if the key was unexpectedly reused for another kind of item.
do $$
begin
  if exists (
    select 1
    from public.heart_shop_items
    where item_key = 'shared_background_21'
      and (
        category is distinct from 'character'
        or price is distinct from 0
        or avatar_type is distinct from 'shared'
        or character_slot is distinct from 'background'
      )
  ) then
    raise exception 'shared_background_21 is not the expected free shared background';
  end if;

  if (
    select count(*)
    from public.heart_shop_items
    where item_key in (
      'shared_background_22',
      'shared_background_23',
      'shared_background_24'
    )
      and category = 'character'
      and price = 0
      and active = true
      and avatar_type = 'shared'
      and character_slot = 'background'
  ) <> 3 then
    raise exception 'Expected the three remaining new travel backgrounds';
  end if;
end
$$;

-- Force only affected character profiles to regenerate on their next profile load.
update public.profile_avatar_preferences preference
set
  character_signature = null,
  updated_at = now()
where preference.mode = 'character'
  and position(
    'shared_background_21' in coalesce(preference.character_signature, '')
  ) > 0;

-- Preserve ownership history while ensuring the retired layer is not equipped.
update public.heart_shop_purchases purchase
set
  is_enabled = false,
  updated_at = now()
where purchase.item_key = 'shared_background_21'
  and purchase.is_enabled = true;

-- Inactive catalog rows are hidden by the existing authenticated SELECT policy
-- and rejected by the existing apply/toggle RPCs.
update public.heart_shop_items item
set
  active = false,
  updated_at = now()
where item.item_key = 'shared_background_21'
  and item.active is distinct from false;

-- Close the retired item's display-order gap without changing relative order.
update public.heart_shop_items item
set
  sort_order = case item.item_key
    when 'shared_background_22' then 881
    when 'shared_background_23' then 882
    when 'shared_background_24' then 883
  end,
  updated_at = now()
where item.item_key in (
  'shared_background_22',
  'shared_background_23',
  'shared_background_24'
)
  and item.sort_order is distinct from case item.item_key
    when 'shared_background_22' then 881
    when 'shared_background_23' then 882
    when 'shared_background_24' then 883
  end;

-- Transaction safety stop: Hollywood must be unavailable and unequipped.
do $$
begin
  if exists (
    select 1
    from public.heart_shop_items
    where item_key = 'shared_background_21'
      and active = true
  ) then
    raise exception 'Hollywood background retirement failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_purchases
    where item_key = 'shared_background_21'
      and is_enabled = true
  ) then
    raise exception 'Hollywood background remains enabled for a user';
  end if;

  if exists (
    select 1
    from public.profile_avatar_preferences
    where mode = 'character'
      and position(
        'shared_background_21' in coalesce(character_signature, '')
      ) > 0
  ) then
    raise exception 'Hollywood background remains in a character signature';
  end if;
end
$$;

commit;

-- Read-only postcheck: Hollywood is inactive; the other three remain active.
select
  item_key,
  price,
  sort_order,
  active,
  avatar_type,
  character_slot
from public.heart_shop_items
where item_key in (
  'shared_background_21',
  'shared_background_22',
  'shared_background_23',
  'shared_background_24'
)
order by item_key;

select count(*) as enabled_hollywood_background_count
from public.heart_shop_purchases
where item_key = 'shared_background_21'
  and is_enabled = true;
