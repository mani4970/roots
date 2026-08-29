-- 137_heart_shop_character_webp_paths_2_2.sql
-- Synchronizes existing Love Shop character preview paths with the lossless
-- WebP assets deployed by the first PNG optimization phase.
--
-- Run only after the matching WebP files and application code are deployed.
--
-- Safety scope:
-- - Changes preview_path and updated_at only.
-- - Does not change item keys, prices, purchases, ownership, sort order,
--   activation state, avatar metadata, wallets, profiles, or user content.
-- - Leaves eight historical hair rows unchanged because they are not part of
--   the current client catalog and their referenced PNG assets do not exist.
-- - Safe to rerun: the expected eligible count is either 124 or 0.

begin;

do $$
declare
  eligible_count integer;
  updated_count integer;
begin
  select count(*)
  into eligible_count
  from public.heart_shop_items
  where category = 'character'
    and active is true
    and character_slot is distinct from 'hair'
    and lower(split_part(preview_path, '?', 1)) like '%.png';

  if eligible_count not in (0, 124) then
    raise exception
      'Expected 124 legacy character PNG paths or 0 on rerun, found %',
      eligible_count;
  end if;

  if eligible_count = 124 then
    update public.heart_shop_items
    set
      preview_path = regexp_replace(
        preview_path,
        '[.]png([?].*)?$',
        '.webp\1',
        'i'
      ),
      updated_at = now()
    where category = 'character'
      and active is true
      and character_slot is distinct from 'hair'
      and lower(split_part(preview_path, '?', 1)) like '%.png';

    get diagnostics updated_count = row_count;

    if updated_count <> 124 then
      raise exception 'Expected to update 124 character paths, updated %', updated_count;
    end if;
  end if;
end
$$;

-- Stop and roll back unless every current active catalog item now uses WebP.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where category = 'character'
      and active is true
      and character_slot is distinct from 'hair'
  ) <> 141 then
    raise exception 'Expected 141 active current character catalog rows';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where category = 'character'
      and active is true
      and character_slot is distinct from 'hair'
      and lower(split_part(coalesce(preview_path, ''), '?', 1)) not like '%.webp'
  ) then
    raise exception 'One or more current character preview paths are not WebP';
  end if;
end
$$;

commit;

-- Read-only postcheck: expected 141 WebP rows and 0 PNG rows.
select
  count(*) as active_current_character_rows,
  count(*) filter (
    where lower(split_part(preview_path, '?', 1)) like '%.webp'
  ) as webp_rows,
  count(*) filter (
    where lower(split_part(preview_path, '?', 1)) like '%.png'
  ) as png_rows
from public.heart_shop_items
where category = 'character'
  and active is true
  and character_slot is distinct from 'hair';
