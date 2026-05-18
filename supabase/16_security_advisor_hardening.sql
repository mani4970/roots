-- 16_security_advisor_hardening.sql
-- Roots Security Advisor hardening pass.
-- Goal: reduce external execute exposure for SECURITY DEFINER RPC/helper functions
-- without changing app-facing behavior for signed-in users.
--
-- Notes:
-- - Keep authenticated EXECUTE only for RPCs/helper functions that the app or RLS policies still need.
-- - Remove anon EXECUTE where logged-out users should not call the function directly.
-- - Split selected RLS policies so public/anon reads do not require SECURITY DEFINER helpers.
-- - Do not change Bible Reflection/prayer/community app logic.

begin;

-- -----------------------------------------------------------------------------
-- Groups and group_members: split anon/authenticated SELECT policies.
-- This lets logged-out users preview public group invite data without requiring
-- anon EXECUTE on the SECURITY DEFINER helper public.is_group_member(...).
-- -----------------------------------------------------------------------------

drop policy if exists "roots_groups_select_public_or_member_or_owner" on public.groups;
drop policy if exists "roots_groups_select_public" on public.groups;
drop policy if exists "roots_groups_select_authenticated_visible" on public.groups;

create policy "roots_groups_select_public"
on public.groups
for select
to anon
using (is_public = true);

create policy "roots_groups_select_authenticated_visible"
on public.groups
for select
to authenticated
using (
  is_public = true
  or created_by = auth.uid()
  or public.is_group_member(id, auth.uid())
);

drop policy if exists "roots_group_members_select_visible" on public.group_members;
drop policy if exists "roots_group_members_select_public_groups" on public.group_members;
drop policy if exists "roots_group_members_select_authenticated_visible" on public.group_members;

create policy "roots_group_members_select_public_groups"
on public.group_members
for select
to anon
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.is_public = true
  )
);

create policy "roots_group_members_select_authenticated_visible"
on public.group_members
for select
to authenticated
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

-- -----------------------------------------------------------------------------
-- Bible Reflection records and reactions: Roots currently requires login for
-- community/reflection interactions. Restrict these RLS policies to authenticated
-- users so anon does not need EXECUTE on can_view_qt_record(...).
-- -----------------------------------------------------------------------------

drop policy if exists "roots_qt_records_select_visible" on public.qt_records;
create policy "roots_qt_records_select_visible"
on public.qt_records
for select
to authenticated
using (public.can_view_qt_record(visibility, user_id));

drop policy if exists "roots_qt_reactions_select_visible_qt" on public.qt_reactions;
create policy "roots_qt_reactions_select_visible_qt"
on public.qt_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.qt_records q
    where q.id = qt_reactions.qt_id
      and public.can_view_qt_record(q.visibility, q.user_id)
  )
);

drop policy if exists "roots_qt_reactions_insert_visible_qt" on public.qt_reactions;
create policy "roots_qt_reactions_insert_visible_qt"
on public.qt_reactions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.qt_records q
    where q.id = qt_reactions.qt_id
      and public.can_view_qt_record(q.visibility, q.user_id)
  )
);

drop policy if exists "roots_qt_reactions_update_own_visible_qt" on public.qt_reactions;
create policy "roots_qt_reactions_update_own_visible_qt"
on public.qt_reactions
for update
to authenticated
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

-- -----------------------------------------------------------------------------
-- Remove anon EXECUTE from SECURITY DEFINER functions that should not be callable
-- by logged-out users. Keep authenticated grants for functions used by app code
-- or RLS helper policies.
-- -----------------------------------------------------------------------------

revoke execute on function public.can_share_prayer_visibility(text) from anon;
revoke execute on function public.can_view_prayer_item(text, uuid) from anon;
revoke execute on function public.can_view_qt_record(text, uuid) from anon;
revoke execute on function public.get_group_invite(uuid) from anon;
revoke execute on function public.get_my_group_preferences() from anon;
revoke execute on function public.increment_prayer_count(uuid) from anon;
revoke execute on function public.is_group_member(uuid, uuid) from anon;
revoke execute on function public.leave_group(uuid) from anon;
revoke execute on function public.mark_group_qt_seen(uuid) from anon;
revoke execute on function public.mark_group_qt_seen_v2(uuid) from anon;
revoke execute on function public.set_group_favorite(uuid, boolean) from anon;
revoke execute on function public.set_group_favorite_v2(uuid, boolean) from anon;

-- Trigger-only auth user bootstrap should not be callable through /rest/v1/rpc.
-- This function exists in the live DB even if it is not part of every local SQL file.
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Explicitly keep authenticated execute for app-facing RPCs and RLS helper funcs.
grant execute on function public.can_share_prayer_visibility(text) to authenticated;
grant execute on function public.can_view_prayer_item(text, uuid) to authenticated;
grant execute on function public.can_view_qt_record(text, uuid) to authenticated;
grant execute on function public.get_group_invite(uuid) to authenticated;
grant execute on function public.get_my_group_preferences() to authenticated;
grant execute on function public.increment_prayer_count(uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.mark_group_qt_seen(uuid) to authenticated;
grant execute on function public.mark_group_qt_seen_v2(uuid) to authenticated;
grant execute on function public.set_group_favorite(uuid, boolean) to authenticated;
grant execute on function public.set_group_favorite_v2(uuid, boolean) to authenticated;

-- Companion trigger helper functions are not external RPC APIs.
revoke all on function public.touch_companions_updated_at() from public;
revoke all on function public.guard_companion_updates() from public;

commit;

-- Suggested post-run checks:
-- 1) Re-run Supabase Security Advisor.
-- 2) Test public group invite page while logged out.
-- 3) Test logged-in community, group favorite, group seen, leave group, prayer count.
-- 4) Test Bible Reflection and prayer visibility for private / all / group shares.
