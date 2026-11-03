-- 172_personal_reflection_challenge_november_2_2.sql
-- November personal challenge: announce Nov 5; complete Nov 9-19 daily;
-- Letter of Gratitude badge + 30 Love Hearts, once per account.
-- Independent reward ledger only: no QT/progress/streak/check-in schema,
-- trigger or RPC changes. Existing earned Word Fruit badges are preserved.
-- Run this complete file before deploying the matching app patch.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regclass('public.qt_records') is null
    or to_regclass('public.profiles') is null
    or to_regclass('public.love_heart_events') is null
    or to_regclass('public.love_heart_wallets') is null
    or to_regprocedure('public.award_own_reward_badge(uuid,text)') is null
  then raise exception 'Safety stop: existing Roots reward foundation is missing'; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'qt_records'
      and column_name = 'completed_at' and data_type = 'timestamp with time zone'
  ) then raise exception 'Safety stop: immutable QT completion timestamp is missing'; end if;
end;
$$;

-- Snapshot existing function definitions. The one intentionally retired badge
-- RPC is excluded; every other existing public function must stay unchanged.
create temporary table roots_personal_172_function_guard on commit drop as
select p.oid, md5(pg_get_functiondef(p.oid)) as definition_hash
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind in ('f', 'p')
  and p.proname not in (
    'award_own_reward_badge', 'record_personal_challenge_completion',
    'get_personal_challenge_status', 'claim_personal_challenge_rewards',
    'get_unseen_personal_challenge_rewards', 'mark_personal_challenge_reward_seen',
    'get_personal_challenge_badges', 'sync_personal_challenge'
  );

create table if not exists public.personal_reflection_challenges (
  id text primary key,
  title text not null,
  announcement_date date not null,
  start_date date not null,
  end_date date not null,
  required_days integer not null check (required_days > 0),
  reward_hearts integer not null check (reward_hearts >= 0),
  badge_name text not null,
  badge_image_path text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (announcement_date <= start_date and start_date <= end_date),
  check (required_days = end_date - start_date + 1)
);

create table if not exists public.personal_reflection_challenge_completions (
  challenge_id text not null references public.personal_reflection_challenges(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  completion_date date not null,
  qt_record_id uuid references public.qt_records(id) on delete set null,
  utc_offset_minutes integer not null check (utc_offset_minutes between -840 and 840),
  completed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  primary key (challenge_id, user_id, completion_date),
  unique (challenge_id, user_id, qt_record_id)
);
create index if not exists personal_reflection_completions_owner_date_idx
  on public.personal_reflection_challenge_completions(user_id, completion_date);

create table if not exists public.personal_reflection_challenge_awards (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.personal_reflection_challenges(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_title text not null,
  start_date date not null,
  end_date date not null,
  badge_name text not null,
  badge_image_path text not null,
  hearts_awarded integer not null check (hearts_awarded >= 0),
  awarded_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (challenge_id, user_id)
);
create index if not exists personal_reflection_awards_owner_unseen_idx
  on public.personal_reflection_challenge_awards(user_id, awarded_at)
  where seen_at is null;
create index if not exists personal_reflection_awards_owner_awarded_idx
  on public.personal_reflection_challenge_awards(user_id, awarded_at desc);

alter table public.personal_reflection_challenges enable row level security;
alter table public.personal_reflection_challenge_completions enable row level security;
alter table public.personal_reflection_challenge_awards enable row level security;

drop policy if exists personal_reflection_campaigns_read on public.personal_reflection_challenges;
create policy personal_reflection_campaigns_read on public.personal_reflection_challenges
  for select to authenticated using (true);
drop policy if exists personal_reflection_completions_read_own on public.personal_reflection_challenge_completions;
create policy personal_reflection_completions_read_own on public.personal_reflection_challenge_completions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists personal_reflection_awards_read_own on public.personal_reflection_challenge_awards;
create policy personal_reflection_awards_read_own on public.personal_reflection_challenge_awards
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.personal_reflection_challenges,
  public.personal_reflection_challenge_completions,
  public.personal_reflection_challenge_awards from public, anon, authenticated;
grant select on public.personal_reflection_challenges,
  public.personal_reflection_challenge_completions,
  public.personal_reflection_challenge_awards to authenticated;
grant all on public.personal_reflection_challenges,
  public.personal_reflection_challenge_completions,
  public.personal_reflection_challenge_awards to service_role;

insert into public.personal_reflection_challenges (
  id,title,announcement_date,start_date,end_date,required_days,reward_hearts,badge_name,badge_image_path
) values (
  'november-2026-gratitude','11월 묵상 챌린지','2026-11-05','2026-11-09','2026-11-19',11,30,
  '감사의 편지','/images/personal-challenges/november-2026-gratitude.webp'
) on conflict (id) do nothing;

do $$
declare v public.personal_reflection_challenges%rowtype;
begin
  select * into strict v from public.personal_reflection_challenges where id = 'november-2026-gratitude';
  if v.announcement_date <> date '2026-11-05' or v.start_date <> date '2026-11-09'
    or v.end_date <> date '2026-11-19' or v.required_days <> 11 or v.reward_hearts <> 30
    or v.badge_image_path <> '/images/personal-challenges/november-2026-gratitude.webp'
  then raise exception 'Safety stop: November personal challenge configuration differs'; end if;
end;
$$;

-- Extend the existing event-source CHECK as a superset of its CURRENT values.
-- Existing reward sources, event rows and wallet history are not rewritten.
do $$
declare v_name text; v_definition text; v_new_definition text;
begin
  select c.conname, pg_get_constraintdef(c.oid)
    into v_name, v_definition
  from pg_constraint c
  where c.conrelid = 'public.love_heart_events'::regclass
    and c.contype = 'c' and c.conname = 'love_heart_events_source_type_check';
  if v_definition is null or position('source_type' in v_definition) = 0
    or position('companion_challenge' in v_definition) = 0
    or position('group_challenge' in v_definition) = 0
  then raise exception 'Safety stop: expected Love Heart event source guard is missing'; end if;
  if position('personal_challenge' in v_definition) = 0 then
    v_new_definition := regexp_replace(v_definition,
      '^CHECK \((.*)\)$', 'CHECK ((\1) OR source_type = ''personal_challenge'')');
    if v_new_definition = v_definition then
      raise exception 'Safety stop: Love Heart source guard could not be extended safely';
    end if;
    execute format('alter table public.love_heart_events drop constraint %I', v_name);
    execute format('alter table public.love_heart_events add constraint %I %s', v_name, v_new_definition);
  end if;
end;
$$;

-- Remove only earlier arities of this NEW feature. Keeping old overloads would
-- bypass the captured-account guard or make PostgREST dispatch ambiguous.
drop function if exists public.record_personal_challenge_completion(date,uuid,integer);
drop function if exists public.sync_personal_challenge(date);
drop function if exists public.get_unseen_personal_challenge_rewards();
drop function if exists public.mark_personal_challenge_reward_seen(uuid);
drop function if exists public.get_personal_challenge_badges();

create or replace function public.record_personal_challenge_completion(
  p_completion_date date, p_qt_record_id uuid, p_utc_offset_minutes integer, p_expected_user_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_record public.qt_records%rowtype;
  v_inserted integer := 0;
  v_campaign_count integer;
begin
  if v_user_id is null then return jsonb_build_object('recorded',false,'reason','not_authenticated'); end if;
  if p_expected_user_id is distinct from v_user_id then
    return jsonb_build_object('recorded',false,'reason','owner_changed');
  end if;
  if p_completion_date is null then return jsonb_build_object('recorded',false,'reason','missing_completion_date'); end if;
  if p_qt_record_id is null then return jsonb_build_object('recorded',false,'reason','missing_qt_record_id'); end if;
  if p_utc_offset_minutes is null or p_utc_offset_minutes not between -840 and 840 then
    return jsonb_build_object('recorded',false,'reason','invalid_utc_offset');
  end if;
  select count(*) into v_campaign_count from public.personal_reflection_challenges c
    where c.enabled and p_completion_date between c.start_date and c.end_date;
  if v_campaign_count = 0 then return jsonb_build_object('recorded',false,'reason','outside_challenge'); end if;
  select * into v_record from public.qt_records q
    where q.id = p_qt_record_id and q.user_id = v_user_id;
  if not found then return jsonb_build_object('recorded',false,'reason','reflection_not_found'); end if;
  if v_record.is_draft is distinct from false or v_record.completed_at is null then
    return jsonb_build_object('recorded',false,'reason','not_completed');
  end if;
  if v_record.date is distinct from p_completion_date
    or ((v_record.completed_at at time zone 'UTC') - make_interval(mins => p_utc_offset_minutes))::date <> p_completion_date
  then return jsonb_build_object('recorded',false,'reason','not_same_local_day'); end if;
  if v_record.completed_at > clock_timestamp() + interval '5 minutes' then
    return jsonb_build_object('recorded',false,'reason','completion_in_future');
  end if;
  -- Use the device offset captured at successful completion, not the retry's
  -- current timezone. A delayed retry after midnight never changes its day.
  insert into public.personal_reflection_challenge_completions (
    challenge_id,user_id,completion_date,qt_record_id,utc_offset_minutes,completed_at
  ) select c.id,v_user_id,p_completion_date,p_qt_record_id,p_utc_offset_minutes,v_record.completed_at
    from public.personal_reflection_challenges c
    where c.enabled and p_completion_date between c.start_date and c.end_date
    on conflict do nothing;
  get diagnostics v_inserted = row_count;
  return jsonb_build_object('recorded',true,'already_recorded',v_inserted = 0,
    'recorded_count',v_inserted,'completion_date',p_completion_date);
end;
$$;

create or replace function public.get_personal_challenge_status(p_today date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.personal_reflection_challenges%rowtype;
  v_dates date[];
  v_count integer;
  v_missed boolean;
  v_awarded boolean;
  v_consecutive integer := 0;
  v_day date;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_today is null then return jsonb_build_object('has_challenge',false); end if;
  select * into v_campaign from public.personal_reflection_challenges c
    where c.enabled and p_today between c.announcement_date and c.end_date
    order by c.start_date,c.id limit 1;
  if not found then return jsonb_build_object('has_challenge',false); end if;
  select coalesce(array_agg(d.completion_date order by d.completion_date),'{}'::date[])
    into v_dates from public.personal_reflection_challenge_completions d
    where d.user_id = v_user_id and d.challenge_id = v_campaign.id and d.completion_date <= p_today;
  v_count := cardinality(v_dates);
  select exists (
    select 1 from generate_series(v_campaign.start_date::timestamp,
      least(v_campaign.end_date,p_today - 1)::timestamp, interval '1 day') d
    where not (d::date = any(v_dates))
  ) into v_missed;
  select exists(select 1 from public.personal_reflection_challenge_awards a
    where a.user_id = v_user_id and a.challenge_id = v_campaign.id) into v_awarded;
  v_day := v_campaign.start_date;
  while v_day <= least(v_campaign.end_date,p_today) loop
    exit when not (v_day = any(v_dates));
    v_consecutive := v_consecutive + 1;
    v_day := v_day + 1;
  end loop;
  return jsonb_build_object(
    'has_challenge',true,'challenge_id',v_campaign.id,'title',v_campaign.title,
    'announcement_date',v_campaign.announcement_date,'start_date',v_campaign.start_date,'end_date',v_campaign.end_date,
    'required_days',v_campaign.required_days,'reward_hearts',v_campaign.reward_hearts,
    'badge_name',v_campaign.badge_name,'badge_image_path',v_campaign.badge_image_path,
    'status',case when v_awarded or v_count = v_campaign.required_days then 'completed'
      when p_today < v_campaign.start_date then 'scheduled' else 'active' end,
    'completed_dates',to_jsonb(v_dates),'completed_days',v_count,'consecutive_days',v_consecutive,
    'has_missed_day',v_missed,'today_completed',p_today = any(v_dates),
    'is_complete',v_count = v_campaign.required_days,'awarded',v_awarded,
    'can_claim',not v_awarded and p_today >= v_campaign.end_date and v_count = v_campaign.required_days
  );
end;
$$;

create or replace function public.get_personal_challenge_badges(p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_result jsonb;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_expected_user_id is distinct from v_user_id then
    raise exception 'owner_changed' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'award_id',a.id,'challenge_id',a.challenge_id,'challenge_title',a.challenge_title,
    'start_date',a.start_date,'end_date',a.end_date,'badge_name',a.badge_name,
    'badge_image_path',a.badge_image_path,'reward_hearts',a.hearts_awarded,'awarded_at',a.awarded_at
  ) order by a.awarded_at desc),'[]'::jsonb) into v_result
  from public.personal_reflection_challenge_awards a where a.user_id = v_user_id;
  return v_result;
end;
$$;

create or replace function public.get_unseen_personal_challenge_rewards(p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_result jsonb;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_expected_user_id is distinct from v_user_id then
    raise exception 'owner_changed' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'award_id',a.id,'challenge_id',a.challenge_id,'challenge_title',a.challenge_title,
    'start_date',a.start_date,'end_date',a.end_date,'badge_name',a.badge_name,
    'badge_image_path',a.badge_image_path,'reward_hearts',a.hearts_awarded,'awarded_at',a.awarded_at
  ) order by a.awarded_at,a.id),'[]'::jsonb) into v_result
  from public.personal_reflection_challenge_awards a where a.user_id = v_user_id and a.seen_at is null;
  return v_result;
end;
$$;

create or replace function public.claim_personal_challenge_rewards(p_today date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.personal_reflection_challenges%rowtype;
  v_award public.personal_reflection_challenge_awards%rowtype;
  v_credit integer;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_today is null then return '[]'::jsonb; end if;
  -- The unique personal award row arbitrates concurrent claims; the canonical
  -- wallet UPSERT serializes balance credits. No existing profile row is locked
  -- by routine Home checks, so core progress writes retain their normal path.
  for v_campaign in select c.* from public.personal_reflection_challenges c
    where c.enabled and c.end_date <= p_today
      and not exists(select 1 from public.personal_reflection_challenge_awards a
        where a.user_id = v_user_id and a.challenge_id = c.id)
      and not exists(
        select 1 from generate_series(c.start_date::timestamp,c.end_date::timestamp,interval '1 day') expected
        where not exists(select 1 from public.personal_reflection_challenge_completions d
          where d.user_id = v_user_id and d.challenge_id = c.id and d.completion_date = expected::date)
      )
    order by c.end_date,c.id
  loop
    insert into public.personal_reflection_challenge_awards (
      challenge_id,user_id,challenge_title,start_date,end_date,badge_name,badge_image_path,hearts_awarded
    ) values (v_campaign.id,v_user_id,v_campaign.title,v_campaign.start_date,v_campaign.end_date,
      v_campaign.badge_name,v_campaign.badge_image_path,v_campaign.reward_hearts)
    on conflict (challenge_id,user_id) do nothing returning * into v_award;
    if not found then continue; end if;
    v_credit := 0;
    if v_campaign.reward_hearts > 0 then
      insert into public.love_heart_events (user_id,source_type,source_id,target_owner_id,amount)
      values (v_user_id,'personal_challenge',v_award.id,null,v_campaign.reward_hearts)
      on conflict (user_id,source_type,source_id) do nothing returning amount into v_credit;
      if coalesce(v_credit,0) > 0 then
        insert into public.love_heart_wallets as wallet (user_id,balance,lifetime_earned,created_at,updated_at)
        values (v_user_id,v_credit,v_credit,now(),now())
        on conflict (user_id) do update set balance = wallet.balance + excluded.balance,
          lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned, updated_at = now();
      end if;
    end if;
  end loop;
  return public.get_unseen_personal_challenge_rewards(v_user_id);
end;
$$;

create or replace function public.mark_personal_challenge_reward_seen(p_award_id uuid, p_expected_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_expected_user_id is distinct from v_user_id then
    raise exception 'owner_changed' using errcode = '42501';
  end if;
  update public.personal_reflection_challenge_awards a set seen_at = now()
    where a.id = p_award_id and a.user_id = v_user_id and a.seen_at is null;
end;
$$;

-- One independent Home request: award once, then read a consistent snapshot.
create or replace function public.sync_personal_challenge(p_today date, p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_expected_user_id is distinct from auth.uid() then
    raise exception 'owner_changed' using errcode = '42501';
  end if;
  perform public.claim_personal_challenge_rewards(p_today);
  return jsonb_build_object(
    'status',public.get_personal_challenge_status(p_today),
    'rewards',public.get_unseen_personal_challenge_rewards(p_expected_user_id)
  );
end;
$$;

-- Retirement is a guard in the currently installed function definition.
-- Every other badge branch and all earned profile flags remain untouched.
do $$
declare v_definition text; v_next text;
begin
  select pg_get_functiondef('public.award_own_reward_badge(uuid,text)'::regprocedure) into v_definition;
  if position('roots_word_fruit_retired_20261103' in v_definition) = 0 then
    if position('p_user_id uuid' in v_definition) = 0 or position('p_badge_key text' in v_definition) = 0
      or position('badge_word_fruit' in v_definition) = 0
    then raise exception 'Safety stop: reward badge RPC signature differs'; end if;
    v_next := regexp_replace(v_definition, '(?im)^begin[ \t]*$', $guard$begin
  -- roots_word_fruit_retired_20261103: preserve previous awards, stop new ones.
  if p_badge_key = 'badge_word_fruit' then
    if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
    if p_user_id is distinct from auth.uid() then raise exception 'user mismatch' using errcode = '42501'; end if;
    return jsonb_build_object('awarded',false,'reason','retired');
  end if;$guard$);
    if v_next = v_definition then raise exception 'Safety stop: reward retirement guard could not be inserted'; end if;
    execute v_next;
  end if;
end;
$$;

revoke execute on function public.record_personal_challenge_completion(date,uuid,integer,uuid),
  public.get_personal_challenge_status(date), public.claim_personal_challenge_rewards(date),
  public.get_unseen_personal_challenge_rewards(uuid), public.mark_personal_challenge_reward_seen(uuid,uuid),
  public.get_personal_challenge_badges(uuid), public.sync_personal_challenge(date,uuid) from public, anon, authenticated;
grant execute on function public.record_personal_challenge_completion(date,uuid,integer,uuid),
  public.get_personal_challenge_status(date), public.claim_personal_challenge_rewards(date),
  public.get_unseen_personal_challenge_rewards(uuid), public.mark_personal_challenge_reward_seen(uuid,uuid),
  public.get_personal_challenge_badges(uuid), public.sync_personal_challenge(date,uuid) to authenticated;

do $$
begin
  if exists(select 1 from roots_personal_172_function_guard g
    where md5(pg_get_functiondef(g.oid)) is distinct from g.definition_hash)
  then raise exception 'Safety stop: an unrelated existing public function changed'; end if;
end;
$$;
notify pgrst, 'reload schema';
commit;

-- Read-only postcheck: every column should be true.
select
  exists(select 1 from public.personal_reflection_challenges where id = 'november-2026-gratitude'
    and announcement_date = '2026-11-05' and start_date = '2026-11-09' and end_date = '2026-11-19'
    and required_days = 11 and reward_hearts = 30) as november_configuration_ready,
  (select count(*) = 3 from pg_class where oid in (
    'public.personal_reflection_challenges'::regclass,
    'public.personal_reflection_challenge_completions'::regclass,
    'public.personal_reflection_challenge_awards'::regclass) and relrowsecurity) as personal_tables_rls_enabled,
  has_table_privilege('authenticated','public.personal_reflection_challenge_awards','SELECT')
    and not has_table_privilege('authenticated','public.personal_reflection_challenge_awards','INSERT')
    and not has_table_privilege('authenticated','public.personal_reflection_challenge_completions','INSERT')
    as clients_cannot_forge_rewards,
  not has_table_privilege('anon','public.personal_reflection_challenge_awards','SELECT')
    and not has_function_privilege('anon','public.claim_personal_challenge_rewards(date)','EXECUTE')
    and not has_function_privilege('anon','public.record_personal_challenge_completion(date,uuid,integer,uuid)','EXECUTE')
    as anonymous_access_blocked,
  has_function_privilege('authenticated','public.get_personal_challenge_status(date)','EXECUTE')
    and has_function_privilege('authenticated','public.claim_personal_challenge_rewards(date)','EXECUTE')
    and has_function_privilege('authenticated','public.get_unseen_personal_challenge_rewards(uuid)','EXECUTE')
    and has_function_privilege('authenticated','public.mark_personal_challenge_reward_seen(uuid,uuid)','EXECUTE')
    and has_function_privilege('authenticated','public.get_personal_challenge_badges(uuid)','EXECUTE')
    and has_function_privilege('authenticated','public.sync_personal_challenge(date,uuid)','EXECUTE')
    as personal_rpcs_ready,
  (select count(*) = 5 from pg_proc p where p.oid in (
    'public.record_personal_challenge_completion(date,uuid,integer,uuid)'::regprocedure,
    'public.sync_personal_challenge(date,uuid)'::regprocedure,
    'public.get_unseen_personal_challenge_rewards(uuid)'::regprocedure,
    'public.mark_personal_challenge_reward_seen(uuid,uuid)'::regprocedure,
    'public.get_personal_challenge_badges(uuid)'::regprocedure)
    and 'p_expected_user_id' = any(p.proargnames)
    and position('owner_changed' in pg_get_functiondef(p.oid)) > 0)
    and to_regprocedure('public.record_personal_challenge_completion(date,uuid,integer)') is null
    and to_regprocedure('public.sync_personal_challenge(date)') is null
    and to_regprocedure('public.get_unseen_personal_challenge_rewards()') is null
    and to_regprocedure('public.mark_personal_challenge_reward_seen(uuid)') is null
    and to_regprocedure('public.get_personal_challenge_badges()') is null
    as expected_owner_guards_ready,
  position('roots_word_fruit_retired_20261103' in
    pg_get_functiondef('public.award_own_reward_badge(uuid,text)'::regprocedure)) > 0 as word_fruit_new_awards_retired;
