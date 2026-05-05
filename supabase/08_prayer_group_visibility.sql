-- Roots prayer group visibility
-- Apply after existing RLS cleanup migrations.
-- Purpose:
-- 1) Allow prayer_items visibility to use the same convention as QT shares:
--    private | all | group_<uuid> | all,group_<uuid>,group_<uuid>
-- 2) Let group members see and pray for group-shared prayer requests.
-- 3) Count group-shared prayer requests as intercession requests without exposing private data.

begin;

-- Helper: prayer visibility check for owner / public share / group share.
create or replace function public.can_view_prayer_item(p_visibility text, p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.uid() = p_owner_id, false)
    or coalesce(p_visibility, '') ilike '%all%'
    or exists (
      select 1
      from public.group_members gm
      where gm.user_id = auth.uid()
        and coalesce(p_visibility, '') ilike ('%group_' || gm.group_id::text || '%')
    );
$$;

-- Helper: validate that a user may save the requested visibility value.
-- "all" is always allowed for the owner. group_<uuid> is allowed only for groups
-- where the current user is a member.
create or replace function public.can_share_prayer_visibility(p_visibility text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  raw_visibility text := coalesce(nullif(trim(p_visibility), ''), 'private');
  target text;
  target_group_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  if raw_visibility = 'private' then
    return true;
  end if;

  foreach target in array string_to_array(raw_visibility, ',') loop
    target := trim(target);

    if target = '' then
      continue;
    elsif target = 'all' then
      continue;
    elsif target like 'group_%' then
      begin
        target_group_id := substring(target from 7)::uuid;
      exception when others then
        return false;
      end;

      if not exists (
        select 1
        from public.group_members gm
        where gm.group_id = target_group_id
          and gm.user_id = auth.uid()
      ) then
        return false;
      end if;
    else
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.can_view_prayer_item(text, uuid) from public;
revoke all on function public.can_share_prayer_visibility(text) from public;
grant execute on function public.can_view_prayer_item(text, uuid) to authenticated;
grant execute on function public.can_share_prayer_visibility(text) to authenticated;

-- prayer_items: replace public-only visibility policy with owner/all/group visibility.
drop policy if exists "roots_prayer_items_select_visible" on public.prayer_items;
drop policy if exists "roots_prayer_items_insert_own" on public.prayer_items;
drop policy if exists "roots_prayer_items_update_own" on public.prayer_items;
drop policy if exists "roots_prayer_items_update_owner" on public.prayer_items;

create policy "roots_prayer_items_select_visible"
on public.prayer_items
for select
to authenticated
using (public.can_view_prayer_item(visibility, user_id));

create policy "roots_prayer_items_insert_own"
on public.prayer_items
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_share_prayer_visibility(visibility)
);

create policy "roots_prayer_items_update_owner"
on public.prayer_items
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.can_share_prayer_visibility(visibility)
);

-- user_prayer_logs: allow "함께 기도해요" for visible public/group prayer requests.
drop policy if exists "roots_user_prayer_logs_select_related" on public.user_prayer_logs;
drop policy if exists "roots_user_prayer_logs_insert_own_for_public_prayer" on public.user_prayer_logs;

create policy "roots_user_prayer_logs_select_related"
on public.user_prayer_logs
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and public.can_view_prayer_item(pi.visibility, pi.user_id)
  )
);

create policy "roots_user_prayer_logs_insert_own_for_visible_prayer"
on public.user_prayer_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and public.can_view_prayer_item(pi.visibility, pi.user_id)
  )
);

-- prayer_likes: answered public+group prayer testimonies may be liked by users who can see them.
drop policy if exists "roots_prayer_likes_select_public_answered_prayer" on public.prayer_likes;
drop policy if exists "roots_prayer_likes_insert_own_public_answered_prayer" on public.prayer_likes;

create policy "roots_prayer_likes_select_visible_answered_prayer"
on public.prayer_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and pi.is_answered = true
      and public.can_view_prayer_item(pi.visibility, pi.user_id)
  )
);

create policy "roots_prayer_likes_insert_own_visible_answered_prayer"
on public.prayer_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and pi.is_answered = true
      and public.can_view_prayer_item(pi.visibility, pi.user_id)
  )
);

commit;
