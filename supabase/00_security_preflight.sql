-- Roots security preflight
-- Run this first in Supabase SQL Editor.
-- It does NOT change data or policies. It only shows current table/RLS/policy/function status.

-- 1) Public tables used by the Roots client/server code
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'qt_records',
    'prayer_items',
    'daily_checkins',
    'daily_prayer_completions',
    'user_prayer_logs',
    'qt_reactions',
    'prayer_likes',
    'groups',
    'group_members',
    'feedback',
    'qt_schedule'
  )
order by c.relname;

-- 2) Existing policies on Roots tables
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'qt_records',
    'prayer_items',
    'daily_checkins',
    'daily_prayer_completions',
    'user_prayer_logs',
    'qt_reactions',
    'prayer_likes',
    'groups',
    'group_members',
    'feedback',
    'qt_schedule'
  )
order by tablename, policyname;

-- 3) Column check for policies below
select
  table_name,
  string_agg(column_name, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'qt_records',
    'prayer_items',
    'daily_checkins',
    'daily_prayer_completions',
    'user_prayer_logs',
    'qt_reactions',
    'prayer_likes',
    'groups',
    'group_members',
    'feedback',
    'qt_schedule'
  )
group by table_name
order by table_name;

-- 4) Storage bucket / storage policies for avatars
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'avatars';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- 5) RPC used by app/community/page.tsx
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('increment_prayer_count');
