-- Roots group preferences and group QT unread state
-- Run this in Supabase SQL Editor before deploying the matching community page patch.

begin;

alter table public.group_members
  add column if not exists is_favorite boolean not null default false;

alter table public.group_members
  add column if not exists last_seen_qt_at timestamptz not null default now();

-- Store or remove a user's favorite star for a group they already joined.
create or replace function public.set_group_favorite(p_group_id uuid, p_is_favorite boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.group_members
  set is_favorite = coalesce(p_is_favorite, false)
  where group_id = p_group_id
    and user_id = auth.uid();
end;
$$;

-- Mark group QT shares as seen for the signed-in member.
create or replace function public.mark_group_qt_seen(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.group_members
  set last_seen_qt_at = now()
  where group_id = p_group_id
    and user_id = auth.uid();
end;
$$;

-- Let a signed-in user leave only their own group membership.
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.group_members
  where group_id = p_group_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.set_group_favorite(uuid, boolean) from public;
revoke all on function public.mark_group_qt_seen(uuid) from public;
revoke all on function public.leave_group(uuid) from public;

grant execute on function public.set_group_favorite(uuid, boolean) to authenticated;
grant execute on function public.mark_group_qt_seen(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;

commit;
