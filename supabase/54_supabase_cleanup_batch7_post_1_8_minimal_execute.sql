-- 54_supabase_cleanup_batch7_post_1_8_minimal_execute.sql
-- Roots post-1.8 Supabase cleanup batch 7: minimal follow-up from audit 53.
--
-- STATUS: SMALL EXECUTION SCRIPT / REVIEW BEFORE RUNNING.
--
-- Why this exists:
-- - 53_supabase_post_1_8_audit.sql showed the post-1.8 foundation is mostly healthy.
-- - D, E, and L returned success/zero-row results.
-- - F still showed authenticated admin-like table grants on two 1.2 partner recipient tables.
-- - H2/I showed anon can still EXECUTE claim_group_challenge_award(uuid), even though it is
--   a logged-in group challenge award claim RPC and already returns not_authenticated when
--   auth.uid() is null.
--
-- Scope:
-- - Remove only TRUNCATE/REFERENCES/TRIGGER from authenticated on:
--   public.prayer_item_recipients
--   public.qt_record_recipients
-- - Remove anon/PUBLIC EXECUTE from:
--   public.claim_group_challenge_award(uuid)
-- - Keep authenticated and service_role EXECUTE on claim_group_challenge_award(uuid).
--
-- Explicitly NOT touched:
-- - progress/streak/Bible Reflection completion logic
-- - public.qt_records
-- - public.daily_checkins
-- - public.profiles
-- - public.prayer_items
-- - public.groups / public.group_members policies
-- - visibility helper functions:
--   can_share_prayer_visibility(text)
--   can_view_prayer_item(text, uuid)
--   can_view_qt_record(text, uuid)
--   is_group_member(uuid, uuid)
-- - get_group_invite(uuid) anon access
-- - default privileges deferred in 42
-- - Storage policies / qt-photos privacy
-- - Love Hearts data or reward logic
--
-- Safety expectation:
-- - This should not affect normal app flows because the app does not need
--   authenticated TRUNCATE/REFERENCES/TRIGGER on recipient tables.
-- - claim_group_challenge_award(uuid) should only be called by signed-in users.
-- - This file includes prechecks, execution, and postchecks.
-- - Run the whole file only when ready to execute this tiny cleanup.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: currently flagged authenticated admin-like grants.
-- Expected before this cleanup: up to 6 rows.
-- Expected after this cleanup: 0 rows.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('prayer_item_recipients', 'qt_record_recipients')
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by table_name, privilege_type;

-- ---------------------------------------------------------------------------
-- B. PRECHECK: claim_group_challenge_award execute visibility.
-- Expected before this cleanup:
-- - anon may currently be true
-- - authenticated should be true
-- - service_role should be true
-- Expected after this cleanup:
-- - anon false
-- - authenticated true
-- - service_role true
-- ---------------------------------------------------------------------------
select
  role_name,
  has_function_privilege(role_name, 'public.claim_group_challenge_award(uuid)', 'EXECUTE') as can_execute
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
order by role_name;

-- ---------------------------------------------------------------------------
-- C. EXECUTE: minimal permission cleanup.
-- ---------------------------------------------------------------------------
begin;

revoke truncate, references, trigger
on table public.prayer_item_recipients
from authenticated;

revoke truncate, references, trigger
on table public.qt_record_recipients
from authenticated;

-- PostgreSQL functions can expose EXECUTE through PUBLIC and/or direct role grants.
-- Revoke both anon and PUBLIC, then explicitly keep the intended signed-in/service grants.
revoke execute on function public.claim_group_challenge_award(uuid) from anon;
revoke execute on function public.claim_group_challenge_award(uuid) from public;

grant execute on function public.claim_group_challenge_award(uuid) to authenticated;
grant execute on function public.claim_group_challenge_award(uuid) to service_role;

commit;

-- ---------------------------------------------------------------------------
-- D. POSTCHECK: admin-like grants should now be gone.
-- Expected: 0 rows.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('prayer_item_recipients', 'qt_record_recipients')
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by table_name, privilege_type;

-- ---------------------------------------------------------------------------
-- E. POSTCHECK: claim_group_challenge_award execute visibility.
-- Expected:
-- - anon false
-- - authenticated true
-- - service_role true
-- ---------------------------------------------------------------------------
select
  role_name,
  has_function_privilege(role_name, 'public.claim_group_challenge_award(uuid)', 'EXECUTE') as can_execute
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
order by role_name;

-- ---------------------------------------------------------------------------
-- F. Optional rollback if a regression is found.
-- Do NOT run unless intentionally rolling this batch back.
-- ---------------------------------------------------------------------------
-- begin;
--
-- grant truncate, references, trigger
-- on table public.prayer_item_recipients
-- to authenticated;
--
-- grant truncate, references, trigger
-- on table public.qt_record_recipients
-- to authenticated;
--
-- grant execute on function public.claim_group_challenge_award(uuid) to anon;
--
-- commit;
