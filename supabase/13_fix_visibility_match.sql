-- Fix visibility token checks to avoid substring matches.
-- Visibility values use comma-separated tokens such as:
--   private
--   all
--   group_<uuid>
--   all,group_<uuid>
-- This migration keeps the existing policies intact and replaces only the
-- helper functions they already call.

begin;

create or replace function public.can_view_qt_record(p_visibility text, p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with visibility_parts as (
    select trim(part) as value
    from unnest(string_to_array(coalesce(p_visibility, ''), ',')) as part
  )
  select coalesce(auth.uid() = p_owner_id, false)
    or exists (
      select 1
      from visibility_parts
      where value = 'all'
    )
    or exists (
      select 1
      from visibility_parts vp
      join public.group_members gm
        on gm.user_id = auth.uid()
       and vp.value = 'group_' || gm.group_id::text
    );
$$;

create or replace function public.can_view_prayer_item(p_visibility text, p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with visibility_parts as (
    select trim(part) as value
    from unnest(string_to_array(coalesce(p_visibility, ''), ',')) as part
  )
  select coalesce(auth.uid() = p_owner_id, false)
    or exists (
      select 1
      from visibility_parts
      where value = 'all'
    )
    or exists (
      select 1
      from visibility_parts vp
      join public.group_members gm
        on gm.user_id = auth.uid()
       and vp.value = 'group_' || gm.group_id::text
    );
$$;

revoke all on function public.can_view_qt_record(text, uuid) from public;
revoke all on function public.can_view_prayer_item(text, uuid) from public;

grant execute on function public.can_view_qt_record(text, uuid) to anon, authenticated;
grant execute on function public.can_view_prayer_item(text, uuid) to anon, authenticated;

commit;
