-- 140_group_challenge_love_hearts_exactly_once_2_2.sql
-- Pay configured Love Hearts when Home creates a group challenge award.
--
-- SAFETY:
-- - Keeps the existing group challenge eligibility and badge rules unchanged.
-- - Pays only when a new (challenge_id, user_id) award row is inserted.
-- - Uses the existing unique Love Heart event key to prevent duplicate credit.
-- - The award, ledger event, and wallet update run in one database transaction.
-- - Does not backfill or modify historical group challenge awards.
-- - A challenge configured with reward_hearts = 0 remains badge-only.

begin;

do $$
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.qt_records') is null
    or to_regclass('public.groups') is null
    or to_regclass('public.group_challenges') is null
    or to_regclass('public.group_challenge_participants') is null
    or to_regclass('public.group_challenge_awards') is null
    or to_regclass('public.companions') is null
    or to_regclass('public.companion_challenges') is null
    or to_regclass('public.companion_challenge_daily_completions') is null
    or to_regclass('public.companion_challenge_awards') is null
    or to_regclass('public.love_heart_events') is null
    or to_regclass('public.love_heart_wallets') is null
  then
    raise exception 'Roots challenge reward prerequisites are missing';
  end if;

  if to_regprocedure('public.claim_pending_challenge_rewards(date)') is null
    or to_regprocedure('public.claim_group_challenge_award(uuid)') is null
  then
    raise exception 'Challenge reward claim functions are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'group_challenges'
      and column_name = 'reward_hearts'
      and data_type = 'integer'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'group_challenge_awards'
      and column_name = 'hearts_awarded'
      and data_type = 'integer'
  ) then
    raise exception 'Group challenge Love Heart columns are missing';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.group_challenge_awards'::regclass
      and constraint_row.contype = 'u'
      and constraint_row.conname = 'group_challenge_awards_challenge_id_user_id_key'
  ) then
    raise exception 'Group challenge award duplicate guard is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.love_heart_events'::regclass
      and constraint_row.contype = 'u'
      and constraint_row.conname = 'love_heart_events_user_id_source_type_source_id_key'
  ) then
    raise exception 'Love Heart event duplicate guard is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.love_heart_events'::regclass
      and constraint_row.contype = 'c'
      and pg_get_constraintdef(constraint_row.oid) like '%group_challenge%'
  ) then
    raise exception 'love_heart_events does not allow group_challenge rewards';
  end if;
end;
$$;

-- Preserve the older detail-screen claim path for cached clients. Production
-- already has this behavior; keeping the definition here prevents schema drift
-- and guarantees the same exactly-once rules on every supported claim path.
create or replace function public.claim_group_challenge_award(
  p_challenge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.group_challenges%rowtype;
  v_group_name text;
  v_total_days integer;
  v_done_days integer;
  v_existing public.group_challenge_awards%rowtype;
  v_award public.group_challenge_awards%rowtype;
  v_heart_amount integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('awarded', false, 'reason', 'not_authenticated');
  end if;

  select *
    into v_challenge
  from public.group_challenges
  where id = p_challenge_id
    and status <> 'cancelled';

  if not found then
    return jsonb_build_object(
      'awarded',
      false,
      'reason',
      'challenge_not_found'
    );
  end if;

  select name
    into v_group_name
  from public.groups
  where id = v_challenge.group_id;

  if current_date <= v_challenge.end_date then
    return jsonb_build_object(
      'awarded',
      false,
      'reason',
      'challenge_not_finished'
    );
  end if;

  if not exists (
    select 1
    from public.group_challenge_participants gcp
    where gcp.challenge_id = v_challenge.id
      and gcp.user_id = v_user_id
  ) then
    return jsonb_build_object(
      'awarded',
      false,
      'reason',
      'not_in_participant_snapshot'
    );
  end if;

  select *
    into v_existing
  from public.group_challenge_awards
  where challenge_id = v_challenge.id
    and user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'awarded', true,
      'already_awarded', true,
      'award_id', v_existing.id,
      'challenge_id', v_challenge.id,
      'challenge_title', coalesce(
        nullif(v_existing.challenge_title, ''),
        v_challenge.title
      ),
      'group_name', coalesce(
        nullif(v_existing.group_name, ''),
        v_group_name,
        ''
      ),
      'badge_name', v_existing.badge_name,
      'badge_image_path', v_existing.badge_image_path,
      'reward_hearts', v_existing.hearts_awarded
    );
  end if;

  v_total_days := (v_challenge.end_date - v_challenge.start_date + 1);

  select count(distinct qr.date)::integer
    into v_done_days
  from public.qt_records qr
  where qr.user_id = v_user_id
    and qr.is_draft = false
    and qr.date between v_challenge.start_date and v_challenge.end_date;

  if v_done_days < v_total_days then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'not_completed',
      'done_days', coalesce(v_done_days, 0),
      'total_days', v_total_days
    );
  end if;

  insert into public.group_challenge_awards (
    challenge_id,
    group_id,
    user_id,
    badge_name,
    badge_description,
    badge_image_path,
    challenge_title,
    group_name,
    hearts_awarded
  ) values (
    v_challenge.id,
    v_challenge.group_id,
    v_user_id,
    coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
    v_challenge.badge_description,
    v_challenge.badge_image_path,
    v_challenge.title,
    coalesce(v_group_name, ''),
    v_challenge.reward_hearts
  )
  on conflict (challenge_id, user_id) do nothing
  returning * into v_award;

  if v_award.id is null then
    select *
      into v_existing
    from public.group_challenge_awards
    where challenge_id = v_challenge.id
      and user_id = v_user_id;

    return jsonb_build_object(
      'awarded', true,
      'already_awarded', true,
      'award_id', v_existing.id,
      'challenge_id', v_challenge.id,
      'challenge_title', coalesce(
        nullif(v_existing.challenge_title, ''),
        v_challenge.title
      ),
      'group_name', coalesce(
        nullif(v_existing.group_name, ''),
        v_group_name,
        ''
      ),
      'badge_name', v_existing.badge_name,
      'badge_image_path', v_existing.badge_image_path,
      'reward_hearts', v_existing.hearts_awarded
    );
  end if;

  v_heart_amount := 0;
  if v_challenge.reward_hearts > 0 then
    insert into public.love_heart_events (
      user_id,
      source_type,
      source_id,
      target_owner_id,
      amount
    ) values (
      v_user_id,
      'group_challenge',
      v_challenge.id,
      null,
      v_challenge.reward_hearts
    )
    on conflict (user_id, source_type, source_id) do nothing
    returning amount into v_heart_amount;

    if coalesce(v_heart_amount, 0) > 0 then
      insert into public.love_heart_wallets as wallet (
        user_id,
        balance,
        lifetime_earned,
        created_at,
        updated_at
      ) values (
        v_user_id,
        v_heart_amount,
        v_heart_amount,
        now(),
        now()
      )
      on conflict (user_id) do update
      set
        balance = wallet.balance + excluded.balance,
        lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned,
        updated_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'awarded', true,
    'already_awarded', false,
    'award_id', v_award.id,
    'challenge_id', v_challenge.id,
    'challenge_title', v_award.challenge_title,
    'group_name', v_award.group_name,
    'badge_name', v_award.badge_name,
    'badge_image_path', v_award.badge_image_path,
    'reward_hearts', coalesce(v_heart_amount, 0)
  );
end;
$$;

comment on function public.claim_group_challenge_award(uuid) is
  'Compatibility claim path: awards the authenticated participant once and credits configured group challenge Love Hearts through a unique ledger event.';

revoke all on function public.claim_group_challenge_award(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_group_challenge_award(uuid)
  to authenticated, service_role;

create or replace function public.claim_pending_challenge_rewards(
  p_today date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rewards jsonb := '[]'::jsonb;
  v_companion_challenge public.companion_challenges%rowtype;
  v_companion_award public.companion_challenge_awards%rowtype;
  v_partner_id uuid;
  v_partner_name text;
  v_pair_days integer := 0;
  v_heart_amount integer := 0;
  v_group_challenge public.group_challenges%rowtype;
  v_group_award public.group_challenge_awards%rowtype;
  v_group_name text;
  v_group_total_days integer := 0;
  v_group_done_days integer := 0;
begin
  if v_user_id is null or p_today is null then
    return v_rewards;
  end if;

  -- Device-local dates can differ from the database date by one day around UTC
  -- midnight. Reject wider values so clients cannot claim a future challenge.
  if p_today < current_date - 1 or p_today > current_date + 1 then
    return v_rewards;
  end if;

  for v_companion_challenge in
    select cc.*
    from public.companion_challenges cc
    where cc.status <> 'cancelled'
      and p_today > cc.end_date
      and not exists (
        select 1
        from public.companion_challenge_awards cca
        where cca.challenge_id = cc.id
          and cca.user_id = v_user_id
      )
    order by cc.end_date, cc.created_at, cc.id
  loop
    v_partner_id := null;
    v_partner_name := '';
    v_pair_days := 0;

    select candidate.partner_id, candidate.pair_days
      into v_partner_id, v_pair_days
    from (
      select
        relation.partner_id,
        relation.relationship_created_at,
        (
          select count(*)::integer
          from public.companion_challenge_daily_completions mine
          where mine.challenge_id = v_companion_challenge.id
            and mine.user_id = v_user_id
            and mine.completion_date between v_companion_challenge.start_date and v_companion_challenge.end_date
            and (
              v_companion_challenge.start_date < date '2026-08-15'
              or mine.completion_date >= relation.relationship_start_date
            )
            and exists (
              select 1
              from public.companion_challenge_daily_completions partner
              where partner.challenge_id = mine.challenge_id
                and partner.user_id = relation.partner_id
                and partner.completion_date = mine.completion_date
            )
        ) as pair_days
      from (
        select
          case
            when c.requester_id = v_user_id then c.receiver_id
            else c.requester_id
          end as partner_id,
          min(c.created_at) as relationship_created_at,
          min(
            coalesce(
              c.accepted_local_date,
              coalesce(c.responded_at, c.updated_at, c.created_at)::date
            )
          ) as relationship_start_date
        from public.companions c
        where c.status = 'accepted'
          and (c.requester_id = v_user_id or c.receiver_id = v_user_id)
        group by case
          when c.requester_id = v_user_id then c.receiver_id
          else c.requester_id
        end
      ) relation
    ) candidate
    where candidate.pair_days >= v_companion_challenge.required_days
    order by
      candidate.pair_days desc,
      candidate.relationship_created_at,
      candidate.partner_id
    limit 1;

    if v_partner_id is null then
      continue;
    end if;

    v_companion_award := null;
    insert into public.companion_challenge_awards (
      challenge_id,
      user_id,
      companion_user_id,
      badge_name,
      badge_description,
      badge_image_path,
      hearts_awarded
    ) values (
      v_companion_challenge.id,
      v_user_id,
      v_partner_id,
      coalesce(nullif(v_companion_challenge.badge_name, ''), v_companion_challenge.title),
      v_companion_challenge.badge_description,
      v_companion_challenge.badge_image_path,
      v_companion_challenge.reward_hearts
    )
    on conflict (challenge_id, user_id) do nothing
    returning * into v_companion_award;

    if v_companion_award.id is null then
      continue;
    end if;

    v_heart_amount := 0;
    if v_companion_challenge.reward_hearts > 0 then
      insert into public.love_heart_events (
        user_id,
        source_type,
        source_id,
        target_owner_id,
        amount
      ) values (
        v_user_id,
        'companion_challenge',
        v_companion_challenge.id,
        v_partner_id,
        v_companion_challenge.reward_hearts
      )
      on conflict (user_id, source_type, source_id) do nothing
      returning amount into v_heart_amount;

      if coalesce(v_heart_amount, 0) > 0 then
        insert into public.love_heart_wallets as wallet (
          user_id,
          balance,
          lifetime_earned,
          created_at,
          updated_at
        ) values (
          v_user_id,
          v_heart_amount,
          v_heart_amount,
          now(),
          now()
        )
        on conflict (user_id) do update
        set
          balance = wallet.balance + excluded.balance,
          lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned,
          updated_at = now();
      end if;
    end if;

    select coalesce(p.name, '')
      into v_partner_name
    from public.profiles p
    where p.id = v_partner_id;

    v_rewards := v_rewards || jsonb_build_array(
      jsonb_build_object(
        'reward_type', 'companion',
        'award_id', v_companion_award.id,
        'challenge_id', v_companion_challenge.id,
        'challenge_title', v_companion_challenge.title,
        'companion_name', coalesce(v_partner_name, ''),
        'group_name', '',
        'badge_name', v_companion_award.badge_name,
        'badge_image_path', v_companion_award.badge_image_path,
        'reward_hearts', coalesce(v_heart_amount, 0)
      )
    );
  end loop;

  for v_group_challenge in
    select gc.*
    from public.group_challenges gc
    where gc.status <> 'cancelled'
      and p_today > gc.end_date
      and exists (
        select 1
        from public.group_challenge_participants gcp
        where gcp.challenge_id = gc.id
          and gcp.user_id = v_user_id
      )
      and not exists (
        select 1
        from public.group_challenge_awards gca
        where gca.challenge_id = gc.id
          and gca.user_id = v_user_id
      )
    order by gc.end_date, gc.created_at, gc.id
  loop
    v_group_total_days := greatest(
      0,
      v_group_challenge.end_date - v_group_challenge.start_date + 1
    );

    select count(distinct qr.date)::integer
      into v_group_done_days
    from public.qt_records qr
    where qr.user_id = v_user_id
      and qr.is_draft = false
      and qr.date between v_group_challenge.start_date and v_group_challenge.end_date;

    if v_group_total_days = 0
      or coalesce(v_group_done_days, 0) < v_group_total_days
    then
      continue;
    end if;

    select coalesce(g.name, '')
      into v_group_name
    from public.groups g
    where g.id = v_group_challenge.group_id;

    v_group_award := null;
    insert into public.group_challenge_awards (
      challenge_id,
      group_id,
      user_id,
      badge_name,
      badge_description,
      badge_image_path,
      challenge_title,
      group_name,
      hearts_awarded
    ) values (
      v_group_challenge.id,
      v_group_challenge.group_id,
      v_user_id,
      coalesce(nullif(v_group_challenge.badge_name, ''), v_group_challenge.title),
      v_group_challenge.badge_description,
      v_group_challenge.badge_image_path,
      v_group_challenge.title,
      coalesce(v_group_name, ''),
      v_group_challenge.reward_hearts
    )
    on conflict (challenge_id, user_id) do nothing
    returning * into v_group_award;

    if v_group_award.id is null then
      continue;
    end if;

    v_heart_amount := 0;
    if v_group_challenge.reward_hearts > 0 then
      insert into public.love_heart_events (
        user_id,
        source_type,
        source_id,
        target_owner_id,
        amount
      ) values (
        v_user_id,
        'group_challenge',
        v_group_challenge.id,
        null,
        v_group_challenge.reward_hearts
      )
      on conflict (user_id, source_type, source_id) do nothing
      returning amount into v_heart_amount;

      if coalesce(v_heart_amount, 0) > 0 then
        insert into public.love_heart_wallets as wallet (
          user_id,
          balance,
          lifetime_earned,
          created_at,
          updated_at
        ) values (
          v_user_id,
          v_heart_amount,
          v_heart_amount,
          now(),
          now()
        )
        on conflict (user_id) do update
        set
          balance = wallet.balance + excluded.balance,
          lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned,
          updated_at = now();
      end if;
    end if;

    v_rewards := v_rewards || jsonb_build_array(
      jsonb_build_object(
        'reward_type', 'group',
        'award_id', v_group_award.id,
        'challenge_id', v_group_challenge.id,
        'challenge_title', v_group_award.challenge_title,
        'companion_name', '',
        'group_name', v_group_award.group_name,
        'badge_name', v_group_award.badge_name,
        'badge_image_path', v_group_award.badge_image_path,
        'reward_hearts', coalesce(v_heart_amount, 0)
      )
    );
  end loop;

  return v_rewards;
end;
$$;

comment on function public.claim_pending_challenge_rewards(date) is
  'Returns newly paid challenge rewards after the device-local end date. Group and companion Love Hearts are credited once through unique ledger events; Part 2 companion pair days count only on/after the pair accepted local date.';

revoke all on function public.claim_pending_challenge_rewards(date)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_pending_challenge_rewards(date)
  to authenticated, service_role;

do $$
declare
  v_pending_definition text;
  v_direct_definition text;
begin
  select pg_get_functiondef('public.claim_pending_challenge_rewards(date)'::regprocedure)
    into v_pending_definition;

  select pg_get_functiondef('public.claim_group_challenge_award(uuid)'::regprocedure)
    into v_direct_definition;

  if position('''group_challenge''' in v_pending_definition) = 0
    or position('hearts_awarded' in v_pending_definition) = 0
    or position('love_heart_wallets' in v_pending_definition) = 0
    or position('''group_challenge''' in v_direct_definition) = 0
    or position('hearts_awarded' in v_direct_definition) = 0
    or position('love_heart_wallets' in v_direct_definition) = 0
  then
    raise exception 'Group challenge Love Heart claim logic was not installed';
  end if;

  if has_function_privilege(
    'anon',
    'public.claim_pending_challenge_rewards(date)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute claim_pending_challenge_rewards(date)';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.claim_pending_challenge_rewards(date)',
    'EXECUTE'
  ) then
    raise exception 'authenticated EXECUTE grant is missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.claim_group_challenge_award(uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute claim_group_challenge_award(uuid)';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.claim_group_challenge_award(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated group award EXECUTE grant is missing';
  end if;
end;
$$;

commit;

-- Read-only operator checks returned by the SQL editor.
select
  gc.id as challenge_id,
  g.name as group_name,
  gc.title,
  gc.end_date,
  gc.reward_hearts,
  count(distinct gcp.user_id) as participant_count,
  count(distinct gca.user_id) as award_count,
  count(distinct lhe.user_id) as heart_event_count
from public.group_challenges gc
join public.groups g
  on g.id = gc.group_id
left join public.group_challenge_participants gcp
  on gcp.challenge_id = gc.id
left join public.group_challenge_awards gca
  on gca.challenge_id = gc.id
left join public.love_heart_events lhe
  on lhe.source_type = 'group_challenge'
 and lhe.source_id = gc.id
where gc.end_date >= date '2026-09-01'
group by gc.id, g.name, gc.title, gc.end_date, gc.reward_hearts
order by gc.end_date, g.name;

select
  (
    select count(*)
    from (
      select user_id, source_type, source_id
      from public.love_heart_events
      group by user_id, source_type, source_id
      having count(*) > 1
    ) duplicate_events
  ) as duplicate_love_heart_event_keys,
  (
    select count(*)
    from (
      select challenge_id, user_id
      from public.group_challenge_awards
      group by challenge_id, user_id
      having count(*) > 1
    ) duplicate_awards
  ) as duplicate_group_award_keys;
