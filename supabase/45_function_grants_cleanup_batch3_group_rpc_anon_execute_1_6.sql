-- 45_function_grants_cleanup_batch3_group_rpc_anon_execute_1_6.sql
-- Roots 1.6 Supabase function/RPC grants cleanup batch 3 execution candidate.
--
-- STATUS: EXECUTION CANDIDATE / DO NOT RUN WHOLE FILE BLINDLY.
-- This file is safe to run as-is only for the active SELECT pre/postcheck queries
-- because all permission-changing statements are commented out.
--
-- Context from earlier 1.6 cleanup:
-- - 42 default privileges cleanup is deferred because SQL Editor lacked permission.
-- - 43 anon table cleanup precheck found no anon grants on the 9 reviewed tables.
-- - 44 removed only TRUNCATE/REFERENCES/TRIGGER from authenticated on the
--   9 reviewed newer/support tables; app regression checks reported no issues.
--
-- Batch 3 scope:
-- - Function/RPC EXECUTE grants only.
-- - Review login-user-only group preference/read-state RPCs that should not be
--   executable by logged-out/anon callers.
-- - Do NOT change function bodies, RLS policies, table grants, storage, app code,
--   progress/streak logic, Bible Reflection completion logic, or feed visibility.
--
-- Target functions for review:
-- - get_my_group_preferences()
-- - leave_group(uuid)
-- - mark_group_qt_seen(uuid)
-- - mark_group_qt_seen_v2(uuid)
-- - set_group_favorite(uuid, boolean)
-- - set_group_favorite_v2(uuid, boolean)
--
-- Explicitly NOT touched in this batch:
-- - get_group_invite(uuid): keep anon access until logged-out invite flow is
--   verified another way.
-- - can_view_qt_record(text, uuid), can_view_prayer_item(text, uuid),
--   can_share_prayer_visibility(text), is_group_member(uuid, uuid): helper
--   functions used by RLS/feed visibility; do not tighten in this batch.
-- - increment_prayer_count(uuid): already intended for authenticated only;
--   not part of this tiny batch.
-- - claim_group_challenge_award(uuid): do not touch group challenge award logic.
-- - handle_new_user(), guard_companion_updates(), touch_companions_updated_at():
--   trigger-only functions are deferred to a separate batch after this one.
--
-- Safety:
-- - Run the read-only prechecks first and export/save the output.
-- - Do not execute the commented block until the precheck output is reviewed.
-- - If PUBLIC still has EXECUTE on these functions, revoking anon alone may not
--   be enough; decide the execution shape only after reviewing precheck output.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current routine grants for target RPCs.
-- Read-only. Save/export this output before any execution.
-- Expected review focus:
-- - anon should not need EXECUTE on these functions.
-- - PUBLIC should normally not have EXECUTE on these functions.
-- - authenticated should keep EXECUTE.
-- - service_role may keep EXECUTE explicitly.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_my_group_preferences',
    'leave_group',
    'mark_group_qt_seen',
    'mark_group_qt_seen_v2',
    'set_group_favorite',
    'set_group_favorite_v2'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- B. PRECHECK: exact signatures, security mode, owner, and raw ACL.
-- Read-only. This helps avoid touching the wrong overloaded function.
-- ---------------------------------------------------------------------------
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner,
  p.proacl as raw_acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_my_group_preferences',
    'leave_group',
    'mark_group_qt_seen',
    'mark_group_qt_seen_v2',
    'set_group_favorite',
    'set_group_favorite_v2'
  )
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- C. PRECHECK: confirm intentionally excluded sensitive/helper functions.
-- Read-only. This is a guardrail so we can see these functions but not touch them.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_group_invite',
    'can_view_qt_record',
    'can_view_prayer_item',
    'can_share_prayer_visibility',
    'is_group_member',
    'increment_prayer_count',
    'claim_group_challenge_award',
    'handle_new_user',
    'guard_companion_updates',
    'touch_companions_updated_at'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- D. EXECUTION BLOCK — COMMENTED OUT ON PURPOSE.
--
-- DO NOT RUN until explicitly approved after A/B/C are reviewed.
--
-- Candidate intent:
-- - Remove logged-out/anon direct EXECUTE from authenticated-user group RPCs.
-- - If precheck shows PUBLIC EXECUTE, remove PUBLIC too and re-grant
--   authenticated/service_role explicitly.
-- - Keep authenticated app behavior working.
--
-- NOTE: The exact execution block may be adjusted after precheck results.
-- ---------------------------------------------------------------------------

-- begin;
--
-- -- Remove PUBLIC first if precheck shows PUBLIC EXECUTE. Then restore explicit
-- -- app roles below. If precheck shows no PUBLIC grants, these revokes should be
-- -- harmless, but still run only after explicit approval.
-- revoke execute on function public.get_my_group_preferences() from public;
-- revoke execute on function public.leave_group(uuid) from public;
-- revoke execute on function public.mark_group_qt_seen(uuid) from public;
-- revoke execute on function public.mark_group_qt_seen_v2(uuid) from public;
-- revoke execute on function public.set_group_favorite(uuid, boolean) from public;
-- revoke execute on function public.set_group_favorite_v2(uuid, boolean) from public;
--
-- revoke execute on function public.get_my_group_preferences() from anon;
-- revoke execute on function public.leave_group(uuid) from anon;
-- revoke execute on function public.mark_group_qt_seen(uuid) from anon;
-- revoke execute on function public.mark_group_qt_seen_v2(uuid) from anon;
-- revoke execute on function public.set_group_favorite(uuid, boolean) from anon;
-- revoke execute on function public.set_group_favorite_v2(uuid, boolean) from anon;
--
-- grant execute on function public.get_my_group_preferences() to authenticated;
-- grant execute on function public.leave_group(uuid) to authenticated;
-- grant execute on function public.mark_group_qt_seen(uuid) to authenticated;
-- grant execute on function public.mark_group_qt_seen_v2(uuid) to authenticated;
-- grant execute on function public.set_group_favorite(uuid, boolean) to authenticated;
-- grant execute on function public.set_group_favorite_v2(uuid, boolean) to authenticated;
--
-- grant execute on function public.get_my_group_preferences() to service_role;
-- grant execute on function public.leave_group(uuid) to service_role;
-- grant execute on function public.mark_group_qt_seen(uuid) to service_role;
-- grant execute on function public.mark_group_qt_seen_v2(uuid) to service_role;
-- grant execute on function public.set_group_favorite(uuid, boolean) to service_role;
-- grant execute on function public.set_group_favorite_v2(uuid, boolean) to service_role;
--
-- commit;

-- ---------------------------------------------------------------------------
-- E. POSTCHECK: routine grants for target RPCs.
-- Read-only.
-- Expected after execution:
-- - No anon EXECUTE rows for the six target functions.
-- - No PUBLIC EXECUTE rows for the six target functions.
-- - authenticated keeps EXECUTE.
-- - service_role keeps EXECUTE.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_my_group_preferences',
    'leave_group',
    'mark_group_qt_seen',
    'mark_group_qt_seen_v2',
    'set_group_favorite',
    'set_group_favorite_v2'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- F. Focused regression checklist after execution.
-- ---------------------------------------------------------------------------
-- [ ] Logged-out group invite page still loads. Important: get_group_invite was not touched.
-- [ ] Logged-in group invite/join works.
-- [ ] Community group tab loads.
-- [ ] Group favorite toggle works.
-- [ ] Group unread/seen marker updates after opening a group.
-- [ ] Leave group works with a test/disposable group only.
-- [ ] Community all/group/partner feeds still load.
-- [ ] Bible Reflection progress/streak flow is unchanged.
-- [ ] Reward maps are unchanged.
-- [ ] Group challenge cards/progress still load.

-- ---------------------------------------------------------------------------
-- G. Emergency rollback notes — DO NOT RUN unless explicitly approved.
-- Prefer restoring only the exact missing function grant shown by PostgREST 42501.
-- ---------------------------------------------------------------------------
-- Example targeted rollback shapes only:
-- grant execute on function public.get_my_group_preferences() to authenticated;
-- grant execute on function public.mark_group_qt_seen_v2(uuid) to authenticated;
-- grant execute on function public.set_group_favorite_v2(uuid, boolean) to authenticated;
-- grant execute on function public.get_group_invite(uuid) to anon;
