-- Roots group favorite persistence fix
-- Run this once in Supabase SQL Editor, then deploy the matching community page patch.

begin;

alter table public.group_members
  add column if not exists is_favorite boolean not null default false;

alter table public.group_members
  add column if not exists last_seen_qt_at timestamptz not null default now();

-- Make favorite saving fail loudly if the signed-in user is not actually a member.
-- This prevents the UI from looking saved when no DB row was updated.
create or replace function public.set_group_favorite(p_group_id uuid, p_is_favorite boolean)
returns void
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

  update public.group_members
  set is_favorite = coalesce(p_is_favorite, false)
  where group_id = p_group_id
    and user_id = auth.uid();

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'group membership not found';
  end if;
end;
$$;

revoke all on function public.set_group_favorite(uuid, boolean) from public;
grant execute on function public.set_group_favorite(uuid, boolean) to authenticated;

commit;
