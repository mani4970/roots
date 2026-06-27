-- 39_supabase_cleanup_execution_checklist_1_6.sql
-- Roots 1.6 Supabase cleanup execution checklist.
--
-- STATUS: PLAN / CHECKLIST ONLY.
-- This file contains comments and SELECT audit helpers only.
-- Do NOT paste broad REVOKE/GRANT cleanup into production from here.
--
-- Why this exists:
-- - Supabase announced that public-schema tables require explicit GRANTs for
--   Data API access. New projects changed May 30, 2026; existing projects are
--   enforced October 30, 2026.
-- - Roots uses supabase-js / PostgREST Data API, so explicit grants matter.
-- - Roots production also has older broad grants that should be cleaned carefully.
--
-- Non-negotiable safety rules:
-- - Always work from the latest safe zip.
-- - Do not run broad REVOKE/GRANT changes.
-- - Do not mix Supabase cleanup with push-notification feature patches.
-- - Do not change Bible Reflection completion/progress/streak logic.
-- - Do not change progress-related table structure or RLS in this cleanup pass.
-- - Do not change qt_records / daily_checkins / profiles policies without a separate review.
-- - Do not change sharing visibility policies for qt_records/prayer_items without a separate review.
-- - Do not change community feed visibility logic as part of grants cleanup.
-- - Do not change group challenge progress/award logic or claim RPC behavior.
-- - Do not change storage bucket privacy for qt-photos. It must remain private.
-- - Do not remove anon EXECUTE from get_group_invite until logged-out invite flow is verified another way.
-- - Do not remove helper function access used by RLS policies before inspecting dependencies.
-- - Apply changes only in small phases with rollback time and full regression testing.
--
-- Current 1.6 starting point from repository review:
-- - 1.5 group challenge tables already include explicit authenticated/service_role GRANTs.
-- - 1.5 group challenge tables have RLS enabled and policies.
-- - claim_group_challenge_award(uuid) revokes PUBLIC and grants EXECUTE to authenticated.
-- - Older support tables still need production grant audit and possibly cleanup.
-- - Existing 26/27/28/29 files remain planning references, not scripts to run blindly.

-- ---------------------------------------------------------------------------
-- A. Start here: run the read-only audit and save output.
-- ---------------------------------------------------------------------------
-- [ ] Run supabase/38_supabase_grants_rls_audit_1_6.sql in Supabase SQL Editor.
-- [ ] Save outputs A-J before any permission change.
-- [ ] Confirm Vercel production and mobile apps are stable before touching permissions.
-- [ ] Confirm at least one test user can log in on web/iOS/Android.

-- Quick sanity: show current branch-independent database grants by role.
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- B. DO-NOT-TOUCH list for the first cleanup pass.
-- These can be audited, but do not change policies/logic in the first pass.
-- ---------------------------------------------------------------------------
-- Bible Reflection/progress/streak:
-- [ ] public.qt_records policies/logic
-- [ ] public.daily_checkins policies/logic
-- [ ] public.profiles progress/name/streak columns and policies
-- [ ] public.qt_schedule schedule access
-- [ ] recordBibleReflectionProgress app flow
--
-- Sharing/feed visibility:
-- [ ] public.qt_record_recipients policies
-- [ ] public.prayer_item_recipients policies
-- [ ] public.prayer_items visibility policies
-- [ ] public.qt_records visibility policies
-- [ ] community all/group/partner feed queries
--
-- Groups/companions:
-- [ ] public.groups policies
-- [ ] public.group_members policies
-- [ ] public.companions policies/triggers
-- [ ] public.companion_preferences policies
-- [ ] get_group_invite(uuid) anon access until invite QA is complete
--
-- Group challenges:
-- [ ] public.group_challenge_requests policies
-- [ ] public.group_challenges policies
-- [ ] public.group_challenge_participants policies
-- [ ] public.group_challenge_awards policies
-- [ ] public.claim_group_challenge_award(uuid) logic
--
-- Storage:
-- [ ] storage bucket qt-photos privacy: keep private
-- [ ] storage bucket avatars public setting: do not change in first pass
-- [ ] storage bucket group-challenge-badges public setting: do not change in first pass

-- ---------------------------------------------------------------------------
-- C. Candidate Phase 1A: function grants only, if audit output matches the plan.
-- Source reference: supabase/28_public_function_grants_cleanup_plan_1_4.sql
-- Do not execute until reviewed line-by-line.
-- ---------------------------------------------------------------------------
-- [ ] Keep get_group_invite(uuid) executable by anon/authenticated/service_role.
-- [ ] Consider removing anon EXECUTE from get_my_group_preferences().
-- [ ] Consider removing anon EXECUTE from mutating group RPCs:
--     leave_group(uuid), mark_group_qt_seen(uuid), mark_group_qt_seen_v2(uuid),
--     set_group_favorite(uuid, boolean), set_group_favorite_v2(uuid, boolean).
-- [ ] Consider removing direct PUBLIC/anon/authenticated EXECUTE from trigger-only functions:
--     guard_companion_updates(), handle_new_user(), touch_companions_updated_at().
-- [ ] Do not touch can_view_qt_record/can_view_prayer_item/is_group_member helpers yet.

-- Phase 1A regression checklist:
-- [ ] Logged-out group invite page loads.
-- [ ] Logged-in group invite/join works.
-- [ ] Group favorite toggle works.
-- [ ] Group unread/seen markers update.
-- [ ] Leave group works.
-- [ ] New signup creates profile through handle_new_user trigger.
-- [ ] Partner request/accept/remove works.
-- [ ] Community all/group/partner feeds still load.

-- ---------------------------------------------------------------------------
-- D. Candidate Phase 1B: table grants, conservative slice only.
-- Source reference: supabase/27_public_table_grants_cleanup_plan_1_4.sql
-- Do not execute until Phase 1A is stable and outputs are reviewed.
-- ---------------------------------------------------------------------------
-- [ ] Remove TRUNCATE/REFERENCES/TRIGGER from anon and authenticated.
-- [ ] Remove INSERT/UPDATE/DELETE from anon.
-- [ ] Re-grant explicit authenticated privileges per current app table needs.
-- [ ] Keep anon SELECT temporarily until logged-out invite/public group flows are verified.
-- [ ] Do not reduce anon SELECT in this phase.

-- Phase 1B regression checklist:
-- [ ] login/signup/OAuth/password reset
-- [ ] Home load and qt_schedule load
-- [ ] Bible Reflection: 6-step, freeform, Sunday, photo
-- [ ] progress/streak/garden/watering/badge flow
-- [ ] prayer create/share/answered/pray together/likes
-- [ ] community all/group/partner feeds and reactions
-- [ ] group create/join/favorite/seen/leave/invite
-- [ ] partner request/accept/remove/share prompt
-- [ ] reports/hide content/hide users
-- [ ] profile photo upload/reset/delete
-- [ ] group challenge request/preparing/card/award/profile badge
-- [ ] account deletion flow

-- ---------------------------------------------------------------------------
-- E. Future migration rule for every new table.
-- ---------------------------------------------------------------------------
-- Every future table migration must include:
-- [ ] create table public.some_table (...)
-- [ ] alter table public.some_table enable row level security;
-- [ ] policies for authenticated/service_role behavior as needed
-- [ ] explicit grants to authenticated/service_role
-- [ ] absent/minimal anon grants unless truly required
--
-- Example shape only; replace privileges and policies per feature:
--
-- grant select, insert, update, delete on table public.some_table to authenticated;
-- grant select, insert, update, delete on table public.some_table to service_role;
-- revoke all privileges on table public.some_table from anon;
