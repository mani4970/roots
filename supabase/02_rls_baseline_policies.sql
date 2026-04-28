-- Roots baseline RLS policies
-- IMPORTANT:
-- 1) Run supabase/00_security_preflight.sql first.
-- 2) Review the output and your actual table columns before applying this file.
-- 3) Apply on a Supabase branch / backup project first if possible.
--
-- Policy design intent:
-- - Users can read/update their own private rows.
-- - Public community content remains readable where the app expects it.
-- - Shared QT records use the existing visibility text convention:
--     private | all | group_<uuid> | all,group_<uuid>,...
-- - Group-scoped QT reads require group membership.
-- - Counter/business updates should preferably go through RPCs, not arbitrary client updates.

-- Enable RLS on all Roots tables exposed through the client.
alter table if exists public.profiles enable row level security;
alter table if exists public.qt_records enable row level security;
alter table if exists public.prayer_items enable row level security;
alter table if exists public.daily_checkins enable row level security;
alter table if exists public.daily_prayer_completions enable row level security;
alter table if exists public.user_prayer_logs enable row level security;
alter table if exists public.qt_reactions enable row level security;
alter table if exists public.prayer_likes enable row level security;
alter table if exists public.groups enable row level security;
alter table if exists public.group_members enable row level security;
alter table if exists public.feedback enable row level security;
alter table if exists public.qt_schedule enable row level security;

-- PROFILES
create policy "roots_profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "roots_profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "roots_profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "roots_profiles_delete_own"
on public.profiles
for delete
to authenticated
using (id = (select auth.uid()));

-- QT RECORDS
create policy "roots_qt_records_select_visible"
on public.qt_records
for select
to authenticated
using (
  user_id = (select auth.uid())
  or visibility ilike '%all%'
  or exists (
    select 1
    from public.group_members gm
    where gm.user_id = (select auth.uid())
      and visibility ilike ('%group_' || gm.group_id::text || '%')
  )
);

create policy "roots_qt_records_insert_own"
on public.qt_records
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "roots_qt_records_update_own"
on public.qt_records
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "roots_qt_records_delete_own"
on public.qt_records
for delete
to authenticated
using (user_id = (select auth.uid()));

-- PRAYER ITEMS
create policy "roots_prayer_items_select_visible"
on public.prayer_items
for select
to authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'all'
);

create policy "roots_prayer_items_insert_own"
on public.prayer_items
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "roots_prayer_items_update_own"
on public.prayer_items
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "roots_prayer_items_delete_own"
on public.prayer_items
for delete
to authenticated
using (user_id = (select auth.uid()));

-- DAILY CHECKINS
create policy "roots_daily_checkins_select_own"
on public.daily_checkins
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "roots_daily_checkins_insert_own"
on public.daily_checkins
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "roots_daily_checkins_update_own"
on public.daily_checkins
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "roots_daily_checkins_delete_own"
on public.daily_checkins
for delete
to authenticated
using (user_id = (select auth.uid()));

-- DAILY PRAYER COMPLETIONS
create policy "roots_daily_prayer_completions_select_own"
on public.daily_prayer_completions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "roots_daily_prayer_completions_insert_own"
on public.daily_prayer_completions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "roots_daily_prayer_completions_update_own"
on public.daily_prayer_completions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "roots_daily_prayer_completions_delete_own"
on public.daily_prayer_completions
for delete
to authenticated
using (user_id = (select auth.uid()));

-- USER PRAYER LOGS
create policy "roots_user_prayer_logs_select_related"
on public.user_prayer_logs
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and (pi.user_id = (select auth.uid()) or pi.visibility = 'all')
  )
);

create policy "roots_user_prayer_logs_insert_own_for_public_prayer"
on public.user_prayer_logs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and pi.visibility = 'all'
  )
);

create policy "roots_user_prayer_logs_delete_own"
on public.user_prayer_logs
for delete
to authenticated
using (user_id = (select auth.uid()));

-- QT REACTIONS
create policy "roots_qt_reactions_select_visible_qt"
on public.qt_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.qt_records qr
    where qr.id = qt_id
      and (
        qr.user_id = (select auth.uid())
        or qr.visibility ilike '%all%'
        or exists (
          select 1
          from public.group_members gm
          where gm.user_id = (select auth.uid())
            and qr.visibility ilike ('%group_' || gm.group_id::text || '%')
        )
      )
  )
);

create policy "roots_qt_reactions_insert_own_visible_qt"
on public.qt_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.qt_records qr
    where qr.id = qt_id
      and (
        qr.visibility ilike '%all%'
        or exists (
          select 1
          from public.group_members gm
          where gm.user_id = (select auth.uid())
            and qr.visibility ilike ('%group_' || gm.group_id::text || '%')
        )
      )
  )
);

create policy "roots_qt_reactions_update_own"
on public.qt_reactions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "roots_qt_reactions_delete_own"
on public.qt_reactions
for delete
to authenticated
using (user_id = (select auth.uid()));

-- PRAYER LIKES
create policy "roots_prayer_likes_select_public_answered_prayer"
on public.prayer_likes
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and pi.visibility = 'all'
      and pi.is_answered = true
  )
);

create policy "roots_prayer_likes_insert_own_public_answered_prayer"
on public.prayer_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.prayer_items pi
    where pi.id = prayer_id
      and pi.visibility = 'all'
      and pi.is_answered = true
  )
);

create policy "roots_prayer_likes_delete_own"
on public.prayer_likes
for delete
to authenticated
using (user_id = (select auth.uid()));

-- GROUPS
-- Public groups must be readable without login because /join first checks public groups
-- before asking the user to log in. Authenticated users can read group metadata so
-- invite links for private groups keep working. Group membership remains controlled
-- by group_members insert/delete policies.
create policy "roots_groups_select_public_anon"
on public.groups
for select
to anon
using (is_public = true);

create policy "roots_groups_select_authenticated"
on public.groups
for select
to authenticated
using (true);

create policy "roots_groups_insert_own"
on public.groups
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "roots_groups_update_owner"
on public.groups
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "roots_groups_delete_owner"
on public.groups
for delete
to authenticated
using (created_by = (select auth.uid()));

-- GROUP MEMBERS
create policy "roots_group_members_select_public_anon"
on public.group_members
for select
to anon
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_id
      and g.is_public = true
  )
);

create policy "roots_group_members_select_authenticated"
on public.group_members
for select
to authenticated
using (true);

create policy "roots_group_members_insert_self_or_owner"
on public.group_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups g
    where g.id = group_id
      and g.created_by = (select auth.uid())
  )
);

create policy "roots_group_members_delete_self_or_owner"
on public.group_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups g
    where g.id = group_id
      and g.created_by = (select auth.uid())
  )
);

-- FEEDBACK
create policy "roots_feedback_insert_own"
on public.feedback
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "roots_feedback_select_own"
on public.feedback
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "roots_feedback_delete_own"
on public.feedback
for delete
to authenticated
using (user_id = (select auth.uid()));

-- QT SCHEDULE
-- The app reads this table for the daily QT plan. Keep it read-only for logged-in users.
create policy "roots_qt_schedule_select_authenticated"
on public.qt_schedule
for select
to authenticated
using (true);

-- AVATAR STORAGE POLICIES
-- Assumption: avatar files are stored under avatars/<user_id>/filename.ext
create policy "roots_avatars_select_public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "roots_avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "roots_avatars_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "roots_avatars_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
