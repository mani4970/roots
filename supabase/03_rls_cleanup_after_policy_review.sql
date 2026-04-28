-- Roots RLS cleanup after policy review
-- Apply after deploying the matching app/join/page.tsx and app/community/page.tsx patch.
-- Purpose:
-- 1) keep current app flows working
-- 2) remove broad policies that expose private/group data
-- 3) remove direct client update permission for prayer_items.prayer_count

begin;

-- Helper: membership check without recursive RLS policy issues.
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_user_id is not null, false)
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = p_user_id
    );
$$;

-- Helper: QT visibility check for owner / public share / group share.
create or replace function public.can_view_qt_record(p_visibility text, p_owner_id uuid)
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

-- Invite-link reader used by app/join/page.tsx.
-- Public groups can be previewed without login.
-- Private groups can be previewed only after login and only by exact UUID link.
create or replace function public.get_group_invite(p_group_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  is_public boolean,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.description,
    g.is_public,
    (
      select count(*)::bigint
      from public.group_members gm
      where gm.group_id = g.id
    ) as member_count
  from public.groups g
  where g.id = p_group_id
    and (g.is_public = true or auth.uid() is not null)
  limit 1;
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.can_view_qt_record(text, uuid) from public;
revoke all on function public.get_group_invite(uuid) from public;

grant execute on function public.is_group_member(uuid, uuid) to anon, authenticated;
grant execute on function public.can_view_qt_record(text, uuid) to anon, authenticated;
grant execute on function public.get_group_invite(uuid) to anon, authenticated;

-- groups: remove broad SELECT policies that made private groups listable.
drop policy if exists "groups_select" on public.groups;
drop policy if exists "그룹 전체 조회" on public.groups;
drop policy if exists "초대링크 그룹 조회" on public.groups;
drop policy if exists "roots_groups_select_public_or_member_or_owner" on public.groups;

create policy "roots_groups_select_public_or_member_or_owner"
on public.groups
for select
to public
using (
  is_public = true
  or created_by = auth.uid()
  or public.is_group_member(id, auth.uid())
);

-- groups: keep owner-only update and ensure updated rows still belong to the owner.
drop policy if exists "groups_update" on public.groups;
drop policy if exists "roots_groups_update_owner" on public.groups;

create policy "roots_groups_update_owner"
on public.groups
for update
to public
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

-- group_members: remove broad SELECT policies; keep member counts visible for public groups
-- and group membership visible for members/owners.
drop policy if exists "group_members_select" on public.group_members;
drop policy if exists "멤버 조회" on public.group_members;
drop policy if exists "roots_group_members_select_visible" on public.group_members;

create policy "roots_group_members_select_visible"
on public.group_members
for select
to public
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and (
        g.is_public = true
        or g.created_by = auth.uid()
        or public.is_group_member(g.id, auth.uid())
      )
  )
);

-- prayer_items: remove policies that made every prayer readable/updatable by any logged-in user.
drop policy if exists "prayer_read" on public.prayer_items;
drop policy if exists "prayer_count_update" on public.prayer_items;
drop policy if exists "prayer_items_update" on public.prayer_items;
drop policy if exists "prayer_update" on public.prayer_items;
drop policy if exists "roots_prayer_items_update_owner" on public.prayer_items;

create policy "roots_prayer_items_update_owner"
on public.prayer_items
for update
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- qt_records: remove broad SELECT/UPDATE policies that could expose group QTs to non-members.
drop policy if exists "qt_records_select" on public.qt_records;
drop policy if exists "qt_records 조회" on public.qt_records;
drop policy if exists "Users update own qt_records" on public.qt_records;
drop policy if exists "qt_records_update" on public.qt_records;
drop policy if exists "roots_qt_records_select_visible" on public.qt_records;

create policy "roots_qt_records_select_visible"
on public.qt_records
for select
to public
using (public.can_view_qt_record(visibility, user_id));

-- qt_reactions: only reactions on QTs the caller may view should be readable/writeable.
drop policy if exists "qt_reactions 조회" on public.qt_reactions;
drop policy if exists "qt_reactions_select" on public.qt_reactions;
drop policy if exists "qt_reactions 추가" on public.qt_reactions;
drop policy if exists "qt_reactions_insert" on public.qt_reactions;
drop policy if exists "qt_reactions 수정" on public.qt_reactions;
drop policy if exists "roots_qt_reactions_select_visible_qt" on public.qt_reactions;
drop policy if exists "roots_qt_reactions_insert_visible_qt" on public.qt_reactions;
drop policy if exists "roots_qt_reactions_update_own_visible_qt" on public.qt_reactions;

create policy "roots_qt_reactions_select_visible_qt"
on public.qt_reactions
for select
to public
using (
  exists (
    select 1
    from public.qt_records q
    where q.id = qt_reactions.qt_id
      and public.can_view_qt_record(q.visibility, q.user_id)
  )
);

create policy "roots_qt_reactions_insert_visible_qt"
on public.qt_reactions
for insert
to public
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.qt_records q
    where q.id = qt_reactions.qt_id
      and public.can_view_qt_record(q.visibility, q.user_id)
  )
);

create policy "roots_qt_reactions_update_own_visible_qt"
on public.qt_reactions
for update
to public
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.qt_records q
    where q.id = qt_reactions.qt_id
      and public.can_view_qt_record(q.visibility, q.user_id)
  )
);

commit;

-- Optional quick verification after running:
-- select tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('groups','group_members','prayer_items','qt_records','qt_reactions')
-- order by tablename, policyname;
