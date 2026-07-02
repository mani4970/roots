-- 53_supabase_post_1_8_audit.sql
-- Roots 1.8 post-v1 Supabase GRANT/RLS/Data API audit helper.
--
-- STATUS: READ ONLY / SELECT ONLY.
-- This file intentionally contains SELECT/WITH queries only.
-- It does NOT change grants, policies, functions, storage buckets, progress/streak data,
-- Bible Reflection records, prayers, groups, companions, badges, reward maps, or Love Heart data.
--
-- Why this exists:
-- - Supabase is changing public-schema Data API exposure behavior.
-- - New public tables need explicit GRANTs before they are reachable through supabase-js,
--   PostgREST, or GraphQL once the new behavior applies to a project.
-- - Roots already started explicit GRANT/RLS cleanup in 1.6.
-- - Roots 1.8 added Love Hearts, so this post-1.8 check confirms the new 1.8 tables/RPC
--   follow the same explicit-GRANT rule before planning 1.8 v2 decoration/customization work.
--
-- Non-negotiable safety rules:
-- - Do not run broad REVOKE/GRANT changes from this file.
-- - Do not change Bible Reflection completion/progress/streak logic.
-- - Do not change qt_records, daily_checkins, profiles, prayer_items, groups, group_members,
--   community feed visibility, invite behavior, notification delivery, storage, or app code here.
-- - Do not touch the deferred 48 visibility-helper area from this file.
-- - If any issue is found, create a tiny follow-up migration with rollback notes and regression tests.
--
-- Expected follow-up after running this audit:
-- - Save/export the query outputs.
-- - If all checks look good, document that Roots 1.8 v1 is Data API explicit-GRANT ready.
-- - If a check returns risky rows, do not fix blindly; review the exact missing grant/policy first.

-- ---------------------------------------------------------------------------
-- A. Audit run marker.
-- ---------------------------------------------------------------------------
select
  now() as audited_at,
  current_database() as database_name,
  current_user as sql_editor_role;

-- ---------------------------------------------------------------------------
-- B. Target table existence + RLS status for post-1.4 support tables and 1.8 Love Hearts.
-- Expected:
-- - table_exists = true for tables already applied in production
-- - rls_enabled = true for app tables
-- ---------------------------------------------------------------------------
with target_tables(area, table_name) as (
  values
    ('1.1 moderation/support', 'content_reports'),
    ('1.1 moderation/support', 'hidden_community_items'),
    ('1.1 moderation/support', 'hidden_community_users'),
    ('1.1 companions', 'companions'),
    ('1.2 companions', 'companion_preferences'),
    ('1.2 partner sharing', 'qt_record_recipients'),
    ('1.2 partner sharing', 'prayer_item_recipients'),
    ('1.5 group challenge', 'group_challenge_requests'),
    ('1.5 group challenge', 'group_challenges'),
    ('1.5 group challenge', 'group_challenge_participants'),
    ('1.5 group challenge', 'group_challenge_awards'),
    ('1.6 notifications', 'notification_preferences'),
    ('1.6 notifications', 'notification_push_tokens'),
    ('1.6 notifications', 'notifications'),
    ('1.8 love hearts', 'love_heart_wallets'),
    ('1.8 love hearts', 'love_heart_events')
), resolved as (
  select
    t.area,
    t.table_name,
    to_regclass(format('public.%I', t.table_name)) as table_oid
  from target_tables t
)
select
  r.area,
  r.table_name,
  r.table_oid is not null as table_exists,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  pg_get_userbyid(c.relowner) as owner,
  c.relacl as raw_acl
from resolved r
left join pg_class c on c.oid = r.table_oid
order by r.area, r.table_name;

-- ---------------------------------------------------------------------------
-- C. Current table grants for the same target tables.
-- Expected:
-- - no anon rows for private/support tables unless a specific logged-out flow requires it
-- - authenticated has only app-required privileges
-- - service_role has operational privileges
-- ---------------------------------------------------------------------------
with target_tables(table_name) as (
  values
    ('content_reports'),
    ('hidden_community_items'),
    ('hidden_community_users'),
    ('companions'),
    ('companion_preferences'),
    ('qt_record_recipients'),
    ('prayer_item_recipients'),
    ('group_challenge_requests'),
    ('group_challenges'),
    ('group_challenge_participants'),
    ('group_challenge_awards'),
    ('notification_preferences'),
    ('notification_push_tokens'),
    ('notifications'),
    ('love_heart_wallets'),
    ('love_heart_events')
)
select
  g.table_schema,
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as privileges
from information_schema.role_table_grants g
join target_tables t on t.table_name = g.table_name
where g.table_schema = 'public'
group by g.table_schema, g.table_name, g.grantee
order by g.table_name, g.grantee;

-- ---------------------------------------------------------------------------
-- D. Missing expected table grants for newer/support tables.
-- Expected result: zero rows.
-- If rows appear, review before creating a tiny follow-up GRANT migration.
-- ---------------------------------------------------------------------------
with expected(table_name, grantee, privilege_type) as (
  values
    -- Moderation/support
    ('content_reports', 'authenticated', 'SELECT'),
    ('content_reports', 'authenticated', 'INSERT'),
    ('content_reports', 'service_role', 'SELECT'),
    ('content_reports', 'service_role', 'INSERT'),
    ('content_reports', 'service_role', 'UPDATE'),
    ('content_reports', 'service_role', 'DELETE'),

    ('hidden_community_items', 'authenticated', 'SELECT'),
    ('hidden_community_items', 'authenticated', 'INSERT'),
    ('hidden_community_items', 'authenticated', 'UPDATE'),
    ('hidden_community_items', 'authenticated', 'DELETE'),
    ('hidden_community_items', 'service_role', 'SELECT'),
    ('hidden_community_items', 'service_role', 'INSERT'),
    ('hidden_community_items', 'service_role', 'UPDATE'),
    ('hidden_community_items', 'service_role', 'DELETE'),

    ('hidden_community_users', 'authenticated', 'SELECT'),
    ('hidden_community_users', 'authenticated', 'INSERT'),
    ('hidden_community_users', 'authenticated', 'UPDATE'),
    ('hidden_community_users', 'authenticated', 'DELETE'),
    ('hidden_community_users', 'service_role', 'SELECT'),
    ('hidden_community_users', 'service_role', 'INSERT'),
    ('hidden_community_users', 'service_role', 'UPDATE'),
    ('hidden_community_users', 'service_role', 'DELETE'),

    -- Companions/partner sharing
    ('companions', 'authenticated', 'SELECT'),
    ('companions', 'authenticated', 'INSERT'),
    ('companions', 'authenticated', 'UPDATE'),
    ('companions', 'authenticated', 'DELETE'),
    ('companions', 'service_role', 'SELECT'),
    ('companions', 'service_role', 'INSERT'),
    ('companions', 'service_role', 'UPDATE'),
    ('companions', 'service_role', 'DELETE'),

    ('companion_preferences', 'authenticated', 'SELECT'),
    ('companion_preferences', 'authenticated', 'INSERT'),
    ('companion_preferences', 'authenticated', 'UPDATE'),
    ('companion_preferences', 'authenticated', 'DELETE'),
    ('companion_preferences', 'service_role', 'SELECT'),
    ('companion_preferences', 'service_role', 'INSERT'),
    ('companion_preferences', 'service_role', 'UPDATE'),
    ('companion_preferences', 'service_role', 'DELETE'),

    ('qt_record_recipients', 'authenticated', 'SELECT'),
    ('qt_record_recipients', 'authenticated', 'INSERT'),
    ('qt_record_recipients', 'authenticated', 'DELETE'),
    ('qt_record_recipients', 'service_role', 'SELECT'),
    ('qt_record_recipients', 'service_role', 'INSERT'),
    ('qt_record_recipients', 'service_role', 'UPDATE'),
    ('qt_record_recipients', 'service_role', 'DELETE'),

    ('prayer_item_recipients', 'authenticated', 'SELECT'),
    ('prayer_item_recipients', 'authenticated', 'INSERT'),
    ('prayer_item_recipients', 'authenticated', 'DELETE'),
    ('prayer_item_recipients', 'service_role', 'SELECT'),
    ('prayer_item_recipients', 'service_role', 'INSERT'),
    ('prayer_item_recipients', 'service_role', 'UPDATE'),
    ('prayer_item_recipients', 'service_role', 'DELETE'),

    -- Group challenge
    ('group_challenge_requests', 'authenticated', 'SELECT'),
    ('group_challenge_requests', 'authenticated', 'INSERT'),
    ('group_challenge_requests', 'service_role', 'SELECT'),
    ('group_challenge_requests', 'service_role', 'INSERT'),
    ('group_challenge_requests', 'service_role', 'UPDATE'),
    ('group_challenge_requests', 'service_role', 'DELETE'),

    ('group_challenges', 'authenticated', 'SELECT'),
    ('group_challenges', 'service_role', 'SELECT'),
    ('group_challenges', 'service_role', 'INSERT'),
    ('group_challenges', 'service_role', 'UPDATE'),
    ('group_challenges', 'service_role', 'DELETE'),

    ('group_challenge_participants', 'authenticated', 'SELECT'),
    ('group_challenge_participants', 'service_role', 'SELECT'),
    ('group_challenge_participants', 'service_role', 'INSERT'),
    ('group_challenge_participants', 'service_role', 'UPDATE'),
    ('group_challenge_participants', 'service_role', 'DELETE'),

    ('group_challenge_awards', 'authenticated', 'SELECT'),
    ('group_challenge_awards', 'service_role', 'SELECT'),
    ('group_challenge_awards', 'service_role', 'INSERT'),
    ('group_challenge_awards', 'service_role', 'UPDATE'),
    ('group_challenge_awards', 'service_role', 'DELETE'),

    -- Notifications foundation
    ('notification_preferences', 'authenticated', 'SELECT'),
    ('notification_preferences', 'authenticated', 'INSERT'),
    ('notification_preferences', 'authenticated', 'UPDATE'),
    ('notification_preferences', 'service_role', 'SELECT'),
    ('notification_preferences', 'service_role', 'INSERT'),
    ('notification_preferences', 'service_role', 'UPDATE'),
    ('notification_preferences', 'service_role', 'DELETE'),

    ('notification_push_tokens', 'authenticated', 'SELECT'),
    ('notification_push_tokens', 'authenticated', 'INSERT'),
    ('notification_push_tokens', 'authenticated', 'UPDATE'),
    ('notification_push_tokens', 'authenticated', 'DELETE'),
    ('notification_push_tokens', 'service_role', 'SELECT'),
    ('notification_push_tokens', 'service_role', 'INSERT'),
    ('notification_push_tokens', 'service_role', 'UPDATE'),
    ('notification_push_tokens', 'service_role', 'DELETE'),

    ('notifications', 'authenticated', 'SELECT'),
    ('notifications', 'service_role', 'SELECT'),
    ('notifications', 'service_role', 'INSERT'),
    ('notifications', 'service_role', 'UPDATE'),
    ('notifications', 'service_role', 'DELETE'),

    -- Love Hearts foundation
    ('love_heart_wallets', 'authenticated', 'SELECT'),
    ('love_heart_wallets', 'service_role', 'SELECT'),
    ('love_heart_wallets', 'service_role', 'INSERT'),
    ('love_heart_wallets', 'service_role', 'UPDATE'),
    ('love_heart_wallets', 'service_role', 'DELETE'),

    ('love_heart_events', 'authenticated', 'SELECT'),
    ('love_heart_events', 'service_role', 'SELECT'),
    ('love_heart_events', 'service_role', 'INSERT'),
    ('love_heart_events', 'service_role', 'UPDATE'),
    ('love_heart_events', 'service_role', 'DELETE')
), actual as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
)
select
  e.table_name,
  e.grantee,
  e.privilege_type as missing_expected_privilege
from expected e
left join actual a
  on a.table_name = e.table_name
 and a.grantee = e.grantee
 and a.privilege_type = e.privilege_type
where a.table_name is null
order by e.table_name, e.grantee, e.privilege_type;

-- D2. Column-level privilege check for notifications.read_at.
-- `grant update (read_at)` is intentionally column-scoped, so it is checked here
-- instead of requiring broad table-level UPDATE for authenticated users.
-- Expected result: one row for authenticated / UPDATE / read_at.
select
  table_schema,
  table_name,
  column_name,
  grantee,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'notifications'
  and column_name = 'read_at'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by table_name, column_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- E. Unexpected anon access on private/support tables.
-- Expected result: zero rows for these target tables.
-- Do not remove anything blindly; if rows appear, check logged-out invite/public paths first.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'companions',
    'companion_preferences',
    'qt_record_recipients',
    'prayer_item_recipients',
    'group_challenge_requests',
    'group_challenges',
    'group_challenge_participants',
    'group_challenge_awards',
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
group by table_name
order by table_name;

-- ---------------------------------------------------------------------------
-- F. Authenticated admin-like table privileges on private/support tables.
-- Expected result: zero rows.
-- TRUNCATE / REFERENCES / TRIGGER should not be needed by normal app clients.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  and table_name in (
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'companions',
    'companion_preferences',
    'qt_record_recipients',
    'prayer_item_recipients',
    'group_challenge_requests',
    'group_challenges',
    'group_challenge_participants',
    'group_challenge_awards',
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
order by table_name, privilege_type;

-- ---------------------------------------------------------------------------
-- G. RLS policies for new 1.6 notification and 1.8 Love Heart tables.
-- Review only.
-- Expected:
-- - notification rows are recipient-owned for authenticated users
-- - love_heart rows are user-owned for authenticated users
-- - service_role operational access is controlled by grants, not user-facing policies
-- ---------------------------------------------------------------------------
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
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- H. App-relevant RPC/function grants after 1.8.
-- Expected:
-- - award_love_heart_once(text, uuid): authenticated/service_role only
-- - get_group_challenge_request_summary(uuid): authenticated/service_role only
-- - claim_group_challenge_award(uuid): authenticated, no anon
-- - get_group_invite(uuid): may need anon for logged-out invite landing; do not change here
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'award_love_heart_once',
    'get_group_challenge_request_summary',
    'claim_group_challenge_award',
    'get_group_invite',
    'get_my_group_preferences',
    'leave_group',
    'mark_group_qt_seen',
    'mark_group_qt_seen_v2',
    'set_group_favorite',
    'set_group_favorite_v2',
    'handle_new_user',
    'guard_companion_updates',
    'touch_companions_updated_at'
  )
order by routine_name, grantee, privilege_type;

-- H2. Effective EXECUTE privileges for the most sensitive app RPCs.
with target_functions(function_name, signature, expected_note) as (
  values
    ('award_love_heart_once', 'public.award_love_heart_once(text, uuid)', '1.8 Love Hearts award RPC; no anon'),
    ('get_group_challenge_request_summary', 'public.get_group_challenge_request_summary(uuid)', '1.6 group challenge summary; no anon'),
    ('claim_group_challenge_award', 'public.claim_group_challenge_award(uuid)', '1.5 challenge award claim; no anon'),
    ('get_group_invite', 'public.get_group_invite(uuid)', 'logged-out invite landing may need anon; do not change here')
), desired_roles(role_name) as (
  values
    ('anon'),
    ('authenticated'),
    ('service_role')
), resolved_functions as (
  select
    function_name,
    signature,
    expected_note,
    to_regprocedure(signature) as function_oid
  from target_functions
), roles as (
  select
    d.role_name,
    pr.oid as role_oid
  from desired_roles d
  left join pg_roles pr on pr.rolname = d.role_name
)
select
  f.function_name,
  f.signature,
  f.expected_note,
  f.function_oid is not null as function_exists,
  r.role_name,
  r.role_oid is not null as role_exists,
  case
    when f.function_oid is null or r.role_oid is null then null
    else has_function_privilege(r.role_oid, f.function_oid, 'EXECUTE')
  end as can_execute
from resolved_functions f
cross join roles r
order by f.function_name, r.role_name;

-- ---------------------------------------------------------------------------
-- I. SECURITY DEFINER functions with anon effective EXECUTE.
-- Review carefully. Do NOT revoke from visibility helpers or invite functions here.
-- This query is for finding follow-up planning candidates only.
-- ---------------------------------------------------------------------------
with app_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), roles as (
  select ar.role_name, r.oid as role_oid
  from app_roles ar
  left join pg_roles r on r.rolname = ar.role_name
), functions as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.oid as function_oid,
    p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner) as owner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef = true
)
select
  f.schema_name,
  f.function_name,
  f.arguments,
  f.security_definer,
  f.owner,
  r.role_name,
  case
    when r.role_oid is null then null
    else has_function_privilege(r.role_oid, f.function_oid, 'EXECUTE')
  end as can_execute
from functions f
cross join roles r
where r.role_name = 'anon'
  and r.role_oid is not null
  and has_function_privilege(r.role_oid, f.function_oid, 'EXECUTE')
order by f.function_name, f.arguments;

-- ---------------------------------------------------------------------------
-- J. Deferred 48 visibility-helper area reminder.
-- Expected: audit only. If rows appear here, that is not an instruction to revoke.
-- Keep these helpers out of cleanup until feed/invite/public visibility is redesigned.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'can_share_prayer_visibility',
    'can_view_prayer_item',
    'can_view_qt_record',
    'is_group_member'
  )
order by routine_name, grantee, privilege_type;

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
  and (
    coalesce(qual, '') ~ 'can_share_prayer_visibility|can_view_prayer_item|can_view_qt_record|is_group_member'
    or coalesce(with_check, '') ~ 'can_share_prayer_visibility|can_view_prayer_item|can_view_qt_record|is_group_member'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- K. Storage buckets and policies relevant to Roots media/rewards.
-- Expected:
-- - qt-photos remains private
-- - avatars may be public depending on existing profile photo flow
-- - group-challenge-badges is public read only for operator-created badge art
-- ---------------------------------------------------------------------------
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('qt-photos', 'avatars', 'group-challenge-badges')
order by id;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ~ 'qt-photos|avatars|group-challenge-badges'
    or coalesce(with_check, '') ~ 'qt-photos|avatars|group-challenge-badges'
  )
order by policyname;

-- ---------------------------------------------------------------------------
-- L. All public tables without RLS enabled.
-- Expected for app-owned tables: zero rows.
-- If extension/system-like tables appear, review separately instead of changing blindly.
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  tableowner,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and rowsecurity is false
order by tablename;

-- ---------------------------------------------------------------------------
-- M. Default privileges overview.
-- Review only. Do not retry the deferred 42 default-privileges cleanup unless the
-- owner/permission path is clear.
-- ---------------------------------------------------------------------------
select
  defaclrole::regrole as role,
  defaclnamespace::regnamespace as schema,
  defaclobjtype as object_type,
  defaclacl as acl
from pg_default_acl
where defaclnamespace = 'public'::regnamespace
order by defaclrole::regrole::text, defaclobjtype;

-- ---------------------------------------------------------------------------
-- N. Decision checklist after running this file.
-- ---------------------------------------------------------------------------
-- [ ] B: All applied target tables exist and have RLS enabled.
-- [ ] D: Missing expected grants returns zero rows.
-- [ ] E: Unexpected anon table grants returns zero rows for private/support tables.
-- [ ] F: Authenticated admin-like grants returns zero rows.
-- [ ] H2: award_love_heart_once has no anon EXECUTE and authenticated can execute.
-- [ ] H2: get_group_challenge_request_summary has no anon EXECUTE and authenticated can execute.
-- [ ] H2: get_group_invite still supports the logged-out invite landing path as needed.
-- [ ] J: Deferred visibility-helper results are saved for later; no cleanup is done now.
-- [ ] K: qt-photos remains private.
-- [ ] L/M: Any unexpected rows are documented for a separate tiny follow-up batch.
