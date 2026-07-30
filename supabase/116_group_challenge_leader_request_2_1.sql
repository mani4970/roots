-- 116_group_challenge_leader_request_2_1.sql
-- Christian Roots 2.1 group challenge leader-only requests
--
-- Purpose:
-- - Only the current group leader (groups.created_by) may submit a group
--   challenge request.
-- - Keep request status, approved challenges, progress, and badge visibility
--   available to all eligible group members through the existing read paths.
-- - Keep final approval, challenge creation, and cancellation in the existing
--   Roots operator workflow.
--
-- Safety:
-- - No existing request, challenge, participant, award, QT, streak, profile,
--   heart, or badge row is changed or deleted.
-- - Existing authenticated INSERT access remains for compatible app rollouts,
--   but RLS now permits inserts only for the current group leader.
-- - The server-only RPC is SECURITY INVOKER and executable only by service_role.

begin;

alter table public.group_challenge_requests enable row level security;

create index if not exists group_challenges_request_id_idx
  on public.group_challenges (request_id);

drop policy if exists "roots_group_challenge_requests_insert_group_member"
  on public.group_challenge_requests;
drop policy if exists "roots_group_challenge_requests_insert_group_leader"
  on public.group_challenge_requests;

create policy "roots_group_challenge_requests_insert_group_leader"
on public.group_challenge_requests
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1
    from public.groups g
    join public.group_members gm
      on gm.group_id = g.id
     and gm.user_id = (select auth.uid())
    where g.id = group_challenge_requests.group_id
      and g.created_by = (select auth.uid())
  )
);

create or replace function public.request_group_challenge_as_leader(
  p_group_id uuid,
  p_actor_id uuid,
  p_requester_email text,
  p_title text,
  p_requested_start_date date,
  p_duration_days integer,
  p_description text default null,
  p_badge_idea text default null,
  p_extra_questions text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_created_at timestamptz;
begin
  if p_group_id is null or p_actor_id is null then
    return jsonb_build_object(
      'created', false,
      'reason', 'not_group_leader'
    );
  end if;

  if p_requester_email is null
     or char_length(btrim(p_requester_email)) not between 3 and 320
     or p_title is null
     or char_length(btrim(p_title)) not between 1 and 120
     or p_requested_start_date is null
     or p_duration_days is null
     or p_duration_days not between 1 and 120 then
    return jsonb_build_object(
      'created', false,
      'reason', 'invalid_challenge_request'
    );
  end if;

  -- Lock the group row so leadership transfer, deletion, and concurrent
  -- challenge requests cannot race this authorization check.
  perform 1
  from public.groups g
  where g.id = p_group_id
    and g.created_by = p_actor_id
  for update;

  if not found then
    return jsonb_build_object(
      'created', false,
      'reason', 'not_group_leader'
    );
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_actor_id
  ) then
    return jsonb_build_object(
      'created', false,
      'reason', 'not_group_leader'
    );
  end if;

  if exists (
    select 1
    from public.group_challenge_requests request
    where request.group_id = p_group_id
      and (
        request.status in ('pending', 'contacted')
        or (
          request.status = 'approved'
          and not exists (
            select 1
            from public.group_challenges challenge
            where challenge.request_id = request.id
          )
        )
      )
  ) then
    return jsonb_build_object(
      'created', false,
      'reason', 'request_already_active'
    );
  end if;

  insert into public.group_challenge_requests (
    group_id,
    requester_id,
    requester_email,
    title,
    requested_start_date,
    duration_days,
    description,
    badge_idea,
    extra_questions
  ) values (
    p_group_id,
    p_actor_id,
    btrim(p_requester_email),
    btrim(p_title),
    p_requested_start_date,
    p_duration_days,
    nullif(btrim(p_description), ''),
    nullif(btrim(p_badge_idea), ''),
    nullif(btrim(p_extra_questions), '')
  )
  returning id, created_at
    into v_request_id, v_created_at;

  return jsonb_build_object(
    'created', true,
    'request_id', v_request_id,
    'created_at', v_created_at
  );
end;
$$;

comment on function public.request_group_challenge_as_leader(
  uuid,
  uuid,
  text,
  text,
  date,
  integer,
  text,
  text,
  text
) is
  'Creates a group challenge request only when the supplied actor is the current group leader. Server-only.';

revoke all on function public.request_group_challenge_as_leader(
  uuid,
  uuid,
  text,
  text,
  date,
  integer,
  text,
  text,
  text
) from public;
revoke all on function public.request_group_challenge_as_leader(
  uuid,
  uuid,
  text,
  text,
  date,
  integer,
  text,
  text,
  text
) from anon;
revoke all on function public.request_group_challenge_as_leader(
  uuid,
  uuid,
  text,
  text,
  date,
  integer,
  text,
  text,
  text
) from authenticated;
grant execute on function public.request_group_challenge_as_leader(
  uuid,
  uuid,
  text,
  text,
  date,
  integer,
  text,
  text,
  text
) to service_role;

-- Preserve the reviewed Data API grants explicitly.
revoke all privileges on table public.group_challenge_requests from public;
revoke all privileges on table public.group_challenge_requests from anon;
revoke all privileges on table public.group_challenge_requests from authenticated;
revoke all privileges on table public.group_challenge_requests from service_role;

grant select, insert on table public.group_challenge_requests to authenticated;
grant select, insert, update, delete
  on table public.group_challenge_requests
  to service_role;

do $$
begin
  if exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'group_challenge_requests'
      and policy.policyname = 'roots_group_challenge_requests_insert_group_member'
  ) then
    raise exception 'legacy group-member challenge request policy still exists';
  end if;

  if not exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'group_challenge_requests'
      and policy.policyname = 'roots_group_challenge_requests_insert_group_leader'
      and policy.cmd = 'INSERT'
      and policy.roles = array['authenticated']::name[]
      and policy.with_check like '%created_by%'
  ) then
    raise exception 'group-leader challenge request policy verification failed';
  end if;

  if to_regprocedure(
    'public.request_group_challenge_as_leader(uuid,uuid,text,text,date,integer,text,text,text)'
  ) is null then
    raise exception 'group challenge request RPC is missing';
  end if;

  -- Effective anon/authenticated checks also catch EXECUTE inherited from
  -- PostgreSQL's PUBLIC pseudo-role.
  if has_function_privilege(
    'anon',
    'public.request_group_challenge_as_leader(uuid,uuid,text,text,date,integer,text,text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.request_group_challenge_as_leader(uuid,uuid,text,text,date,integer,text,text,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.request_group_challenge_as_leader(uuid,uuid,text,text,date,integer,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'group challenge request RPC privileges are incorrect';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    where procedure.oid =
      'public.request_group_challenge_as_leader(uuid,uuid,text,text,date,integer,text,text,text)'::regprocedure
      and procedure.prosecdef
  ) then
    raise exception 'group challenge request RPC must remain SECURITY INVOKER';
  end if;
end;
$$;

commit;

notify pgrst, 'reload schema';
