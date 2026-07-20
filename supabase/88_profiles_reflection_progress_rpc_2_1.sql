-- 88_profiles_reflection_progress_rpc_2_1.sql
-- Christian Roots 2.1 Bible Reflection progress-write stabilization
--
-- Preserved behavior:
--   - streak_days is the accumulated Word-walk day count.
--   - Only a completed, non-draft Reflection owned by the caller can advance it.
--   - One calendar date can advance progress only once.
--   - streak_days, total_days, last_checkin, and the existing milestone badges
--     are updated atomically while preserving the current popup-key order.
--
-- Safe order: run this SQL first, then deploy the matching client patch.
-- Running this SQL does not update any existing user row.


-- =========================================================
-- A. PRECHECK
-- =========================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'id',
    'streak_days',
    'total_days',
    'last_checkin',
    'badge_rootsman',
    'badge_mose',
    'badge_rootsman_bible',
    'badge_david',
    'badge_love',
    'badge_peace',
    'badge_joy',
    'badge_goodness',
    'badge_kindness',
    'badge_patience',
    'badge_faithfulness',
    'badge_gentleness',
    'badge_self_control',
    'badge_angel'
  )
order by ordinal_position;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'qt_records'
  and column_name in ('user_id', 'date', 'is_draft')
order by ordinal_position;

select
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select_profiles,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles,
  has_table_privilege(
    'authenticated', 'public.qt_records', 'SELECT'
  ) as authenticated_can_select_qt_records;


-- =========================================================
-- B. EXECUTE
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  profile_column_count integer;
  qt_column_count integer;
begin
  select count(*)::integer
  into profile_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and (
      (column_name = 'id' and data_type = 'uuid')
      or (column_name = 'streak_days' and data_type = 'integer')
      or (column_name = 'total_days' and data_type = 'integer')
      or (column_name = 'last_checkin' and data_type = 'date')
      or (column_name = 'badge_rootsman' and data_type = 'boolean')
      or (column_name = 'badge_mose' and data_type = 'boolean')
      or (column_name = 'badge_rootsman_bible' and data_type = 'boolean')
      or (column_name = 'badge_david' and data_type = 'boolean')
      or (column_name = 'badge_love' and data_type = 'boolean')
      or (column_name = 'badge_peace' and data_type = 'boolean')
      or (column_name = 'badge_joy' and data_type = 'boolean')
      or (column_name = 'badge_goodness' and data_type = 'boolean')
      or (column_name = 'badge_kindness' and data_type = 'boolean')
      or (column_name = 'badge_patience' and data_type = 'boolean')
      or (column_name = 'badge_faithfulness' and data_type = 'boolean')
      or (column_name = 'badge_gentleness' and data_type = 'boolean')
      or (column_name = 'badge_self_control' and data_type = 'boolean')
      or (column_name = 'badge_angel' and data_type = 'boolean')
    );

  if profile_column_count <> 18 then
    raise exception 'Safety stop: unexpected public.profiles progress schema';
  end if;

  select count(*)::integer
  into qt_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'qt_records'
    and (
      (column_name = 'user_id' and data_type = 'uuid')
      or (column_name = 'date' and data_type = 'date')
      or (column_name = 'is_draft' and data_type = 'boolean')
    );

  if qt_column_count <> 3 then
    raise exception 'Safety stop: unexpected public.qt_records completion schema';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) then
    raise exception 'Safety stop: authenticated profiles SELECT is missing';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) then
    raise exception 'Safety stop: authenticated profiles UPDATE is missing';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.qt_records', 'SELECT'
  ) then
    raise exception 'Safety stop: authenticated qt_records SELECT is missing';
  end if;
end;
$$;

create index if not exists idx_qt_records_user_date_completed
  on public.qt_records (user_id, date)
  where is_draft = false;

do $$
begin
  if not exists (
    select 1
    from pg_index as index_meta
    where index_meta.indexrelid = to_regclass(
        'public.idx_qt_records_user_date_completed'
      )
      and index_meta.indrelid = 'public.qt_records'::regclass
      and index_meta.indisvalid
      and index_meta.indisready
      and not index_meta.indisunique
      and index_meta.indnkeyatts = 2
      and index_meta.indnatts = 2
      and pg_get_indexdef(index_meta.indexrelid, 1, true) = 'user_id'
      and pg_get_indexdef(index_meta.indexrelid, 2, true) = 'date'
      and lower(
        regexp_replace(
          coalesce(
            pg_get_expr(index_meta.indpred, index_meta.indrelid),
            ''
          ),
          '[()[:space:]]',
          '',
          'g'
        )
      ) = 'is_draft=false'
  ) then
    raise exception 'Safety stop: unexpected completed Reflection index definition';
  end if;
end;
$$;

create or replace function public.record_bible_reflection_progress(
  p_user_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_next_streak integer;
  v_next_total integer;
  v_fruit_badge_index integer;
  v_awarded_badges text[] := '{}'::text[];
  v_award_rootsman boolean := false;
  v_award_mose boolean := false;
  v_award_rootsman_bible boolean := false;
  v_award_david boolean := false;
  v_award_love boolean := false;
  v_award_peace boolean := false;
  v_award_joy boolean := false;
  v_award_goodness boolean := false;
  v_award_kindness boolean := false;
  v_award_patience boolean := false;
  v_award_faithfulness boolean := false;
  v_award_gentleness boolean := false;
  v_award_self_control boolean := false;
  v_award_angel boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;

  if p_date is null then
    raise exception 'completion date is required' using errcode = '22004';
  end if;

  -- Supabase current_date is UTC. This one-day window preserves every real
  -- local date worldwide while rejecting arbitrary historical/future calls.
  if p_date < current_date - 1 or p_date > current_date + 1 then
    raise exception 'completion date is outside the current date window'
      using errcode = '22007';
  end if;

  -- Serialize same-user completion attempts before checking last_checkin.
  select profile.*
  into v_profile
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_profile.last_checkin is not null
     and v_profile.last_checkin >= p_date then
    return jsonb_build_object(
      'updated', false,
      'reason', 'already_recorded',
      'awarded_badges', '[]'::jsonb,
      'profile', to_jsonb(v_profile)
    );
  end if;

  if not exists (
    select 1
    from public.qt_records as record
    where record.user_id = v_user_id
      and record.date = p_date
      and record.is_draft = false
  ) then
    raise exception 'completed Bible Reflection not found'
      using errcode = 'P0002';
  end if;

  v_next_streak := case
    when v_profile.last_checkin is null then 1
    else coalesce(v_profile.streak_days, 0) + 1
  end;
  v_next_total := coalesce(v_profile.total_days, 0) + 1;

  v_award_rootsman :=
    v_next_streak >= 7 and not coalesce(v_profile.badge_rootsman, false);
  v_award_mose :=
    v_next_streak >= 40 and not coalesce(v_profile.badge_mose, false);
  v_award_rootsman_bible :=
    v_next_streak >= 52 and not coalesce(v_profile.badge_rootsman_bible, false);
  v_award_david :=
    v_next_streak >= 111 and not coalesce(v_profile.badge_david, false);

  v_fruit_badge_index := case
    when v_next_streak between 100 and 900
      and v_next_streak % 100 = 0
    then (v_next_streak / 100) - 1
    else null
  end;

  v_award_love :=
    v_fruit_badge_index = 0 and not coalesce(v_profile.badge_love, false);
  v_award_peace :=
    v_fruit_badge_index = 1 and not coalesce(v_profile.badge_peace, false);
  v_award_joy :=
    v_fruit_badge_index = 2 and not coalesce(v_profile.badge_joy, false);
  v_award_goodness :=
    v_fruit_badge_index = 3 and not coalesce(v_profile.badge_goodness, false);
  v_award_kindness :=
    v_fruit_badge_index = 4 and not coalesce(v_profile.badge_kindness, false);
  v_award_patience :=
    v_fruit_badge_index = 5 and not coalesce(v_profile.badge_patience, false);
  v_award_faithfulness :=
    v_fruit_badge_index = 6 and not coalesce(v_profile.badge_faithfulness, false);
  v_award_gentleness :=
    v_fruit_badge_index = 7 and not coalesce(v_profile.badge_gentleness, false);
  v_award_self_control :=
    v_fruit_badge_index = 8 and not coalesce(v_profile.badge_self_control, false);
  v_award_angel :=
    v_next_streak >= 1000 and not coalesce(v_profile.badge_angel, false);

  -- Preserve the current client popup-key order.
  if v_award_rootsman then
    v_awarded_badges := array_append(v_awarded_badges, 'badge_rootsman');
  end if;
  if v_award_mose then
    v_awarded_badges := array_append(v_awarded_badges, 'badge_mose');
  end if;
  if v_award_rootsman_bible then
    v_awarded_badges := array_append(v_awarded_badges, 'badge_rootsman_bible');
  end if;
  if v_award_david then
    v_awarded_badges := array_append(v_awarded_badges, 'badge_david');
  end if;
  if v_award_love then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_0');
  end if;
  if v_award_peace then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_1');
  end if;
  if v_award_joy then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_2');
  end if;
  if v_award_goodness then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_3');
  end if;
  if v_award_kindness then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_4');
  end if;
  if v_award_patience then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_5');
  end if;
  if v_award_faithfulness then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_6');
  end if;
  if v_award_gentleness then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_7');
  end if;
  if v_award_self_control then
    v_awarded_badges := array_append(v_awarded_badges, 'fruit_badge_8');
  end if;
  if v_award_angel then
    v_awarded_badges := array_append(v_awarded_badges, 'badge_angel');
  end if;

  update public.profiles as profile
  set
    streak_days = v_next_streak,
    total_days = v_next_total,
    last_checkin = p_date,
    badge_rootsman = case
      when v_award_rootsman then true else profile.badge_rootsman
    end,
    badge_mose = case
      when v_award_mose then true else profile.badge_mose
    end,
    badge_rootsman_bible = case
      when v_award_rootsman_bible then true else profile.badge_rootsman_bible
    end,
    badge_david = case
      when v_award_david then true else profile.badge_david
    end,
    badge_love = case
      when v_award_love then true else profile.badge_love
    end,
    badge_peace = case
      when v_award_peace then true else profile.badge_peace
    end,
    badge_joy = case
      when v_award_joy then true else profile.badge_joy
    end,
    badge_goodness = case
      when v_award_goodness then true else profile.badge_goodness
    end,
    badge_kindness = case
      when v_award_kindness then true else profile.badge_kindness
    end,
    badge_patience = case
      when v_award_patience then true else profile.badge_patience
    end,
    badge_faithfulness = case
      when v_award_faithfulness then true else profile.badge_faithfulness
    end,
    badge_gentleness = case
      when v_award_gentleness then true else profile.badge_gentleness
    end,
    badge_self_control = case
      when v_award_self_control then true else profile.badge_self_control
    end,
    badge_angel = case
      when v_award_angel then true else profile.badge_angel
    end
  where profile.id = v_user_id
  returning profile.* into v_profile;

  return jsonb_build_object(
    'updated', true,
    'reason', 'updated',
    'awarded_badges', to_jsonb(v_awarded_badges),
    'profile', to_jsonb(v_profile)
  );
end;
$$;

comment on function public.record_bible_reflection_progress(uuid, date) is
  'Atomically advances auth.uid() Word-walk progress and existing milestone badges for one completed current-date Bible Reflection.';

revoke execute
  on function public.record_bible_reflection_progress(uuid, date)
  from public, anon, authenticated, service_role;

grant execute
  on function public.record_bible_reflection_progress(uuid, date)
  to authenticated;

commit;


-- =========================================================
-- C. POSTCHECK
-- =========================================================
-- Expected: every boolean below is true except anon/service_role execute.

select
  proc.oid is not null as function_exists,
  proc.prosecdef as security_definer,
  proc.proconfig as function_settings,
  pg_get_userbyid(proc.proowner) as function_owner,
  to_regclass(
    'public.idx_qt_records_user_date_completed'
  ) is not null as completed_lookup_index,
  exists (
    select 1
    from pg_index as index_meta
    where index_meta.indexrelid = to_regclass(
        'public.idx_qt_records_user_date_completed'
      )
      and index_meta.indrelid = 'public.qt_records'::regclass
      and index_meta.indisvalid
      and index_meta.indisready
      and not index_meta.indisunique
      and index_meta.indnkeyatts = 2
      and index_meta.indnatts = 2
      and pg_get_indexdef(index_meta.indexrelid, 1, true) = 'user_id'
      and pg_get_indexdef(index_meta.indexrelid, 2, true) = 'date'
      and lower(
        regexp_replace(
          coalesce(
            pg_get_expr(index_meta.indpred, index_meta.indrelid),
            ''
          ),
          '[()[:space:]]',
          '',
          'g'
        )
      ) = 'is_draft=false'
  ) as completed_lookup_index_valid
from pg_proc as proc
where proc.oid = to_regprocedure(
  'public.record_bible_reflection_progress(uuid,date)'
);

select
  has_function_privilege(
    'anon',
    'public.record_bible_reflection_progress(uuid,date)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.record_bible_reflection_progress(uuid,date)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.record_bible_reflection_progress(uuid,date)',
    'EXECUTE'
  ) as service_role_can_execute;

-- Existing deployed app versions remain compatible during this phase.
select
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- D. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Revert lib/reflectionProgress.ts first, then run:
-- drop function if exists public.record_bible_reflection_progress(uuid, date);
-- drop index if exists public.idx_qt_records_user_date_completed;
