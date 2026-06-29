-- 51_group_challenge_request_summary_rpc_hotfix_1_6.sql
-- Roots 1.6 hotfix: group-wide group challenge request summary RPC.
--
-- Purpose:
-- - The group challenge request table keeps requester contact details private.
-- - Existing RLS lets requesters read their own rows only.
-- - Group detail UI still needs a group-wide non-sensitive summary so all group
--   members see the same challenge state: requested / preparing / active / completed.
--
-- Scope:
-- - Adds/replaces one SECURITY DEFINER RPC that returns only non-sensitive fields.
-- - Does NOT expose requester_email, badge_idea, description, or extra_questions.
-- - Does NOT touch claim_group_challenge_award, progress/streak, feed visibility,
--   qt_records, prayer_items, daily_checkins, profiles, or storage.
-- - No anon grant.

create or replace function public.get_group_challenge_request_summary(p_group_id uuid)
returns table (
  id uuid,
  status text,
  title text,
  requested_start_date date,
  duration_days integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    gcr.id,
    gcr.status,
    gcr.title,
    gcr.requested_start_date,
    gcr.duration_days,
    gcr.created_at
  from public.group_challenge_requests gcr
  where gcr.group_id = p_group_id
    and gcr.status in ('pending', 'contacted', 'approved')
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = (select auth.uid())
    )
  order by
    case gcr.status
      when 'approved' then 0
      when 'contacted' then 1
      when 'pending' then 2
      else 3
    end,
    gcr.created_at desc
  limit 1;
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, and Supabase
-- role grants can still leave anon visible in information_schema. Revoke both the
-- PUBLIC pseudo-role and the anon role explicitly before adding the required grants.
revoke execute on function public.get_group_challenge_request_summary(uuid) from public;
revoke execute on function public.get_group_challenge_request_summary(uuid) from anon;

grant execute on function public.get_group_challenge_request_summary(uuid) to authenticated;
grant execute on function public.get_group_challenge_request_summary(uuid) to service_role;
