-- Roots group favorite and unread state fix
-- Run this in Supabase SQL Editor before deploying the matching app/community/page.tsx patch.
-- It adds RPCs that read and write the signed-in user's group preferences through
-- security-definer functions, so the PWA does not depend on broad group_members SELECT policies.

begin;

alter table public.group_members
  add column if not exists is_favorite boolean not null default false;

alter table public.group_members
  add column if not exists last_seen_qt_at timestamptz not null default now();

-- Read only the current user's group preference rows.
create or replace function public.get_my_group_preferences()
returns table (
  group_id uuid,
  is_favorite boolean,
  last_seen_qt_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gm.group_id,
    coalesce(gm.is_favorite, false) as is_favorite,
    gm.last_seen_qt_at,
    gm.created_at
  from public.group_members gm
  where gm.user_id = auth.uid();
$$;

-- Save favorite and return the persisted value. This intentionally fails if the
-- user is not a member, instead of making the UI look saved when no row changed.
create or replace function public.set_group_favorite_v2(p_group_id uuid, p_is_favorite boolean)
returns table (
  group_id uuid,
  is_favorite boolean,
  last_seen_qt_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.group_members gm
  set is_favorite = coalesce(p_is_favorite, false)
  where gm.group_id = p_group_id
    and gm.user_id = auth.uid();

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'group membership not found';
  end if;

  return query
  select
    gm.group_id,
    coalesce(gm.is_favorite, false) as is_favorite,
    gm.last_seen_qt_at
  from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = auth.uid()
  limit 1;
end;
$$;

-- Mark a group as seen and return the persisted timestamp.
create or replace function public.mark_group_qt_seen_v2(p_group_id uuid)
returns table (
  group_id uuid,
  last_seen_qt_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.group_members gm
  set last_seen_qt_at = now()
  where gm.group_id = p_group_id
    and gm.user_id = auth.uid();

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'group membership not found';
  end if;

  return query
  select gm.group_id, gm.last_seen_qt_at
  from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = auth.uid()
  limit 1;
end;
$$;

revoke all on function public.get_my_group_preferences() from public;
revoke all on function public.set_group_favorite_v2(uuid, boolean) from public;
revoke all on function public.mark_group_qt_seen_v2(uuid) from public;

grant execute on function public.get_my_group_preferences() to authenticated;
grant execute on function public.set_group_favorite_v2(uuid, boolean) to authenticated;
grant execute on function public.mark_group_qt_seen_v2(uuid) to authenticated;

commit;
