-- Roots 2.2 / 180. SQL Editor에서 파일 전체를 한 번에 실행하세요.
-- 개인 묵상 챌린지도 종료 다음 날부터 완주 보상을 지급합니다.
-- 11월 챌린지: 11월 19일까지 완료 기록, 11월 20일부터 완주 보상.
-- 완료 기록, 기존 지급 내역, 하트 잔액, 묵상 진행도는 수정하지 않습니다.
-- 설치된 함수의 날짜 비교 두 곳만 바꾸며, 예상과 다른 정의이면 전체를 중단합니다.

begin;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '250ms';
set local statement_timeout = '5s';
set local idle_in_transaction_session_timeout = '10s';

do $roots180$
declare
  target record;
  function_oid oid;
  original_source text;
  original_definition text;
  original_metadata jsonb;
  expected_source text;
  old_count integer;
  new_count integer;
begin
  for target in
    select * from (values
      ('public.claim_personal_challenge_rewards(date)',
       'c.end_date <= p_today', 'c.end_date < p_today'),
      ('public.get_personal_challenge_status(date)',
       'p_today >= v_campaign.end_date', 'p_today > v_campaign.end_date')
    ) as changes(signature, old_comparison, new_comparison)
  loop
    function_oid := to_regprocedure(target.signature);
    if function_oid is null then
      raise exception '180: required function % is missing. No changes committed.', target.signature;
    end if;

    if not exists (
      select 1 from pg_proc p join pg_language l on l.oid = p.prolang
      where p.oid = function_oid and p.prokind = 'f'
        and p.prorettype = 'jsonb'::regtype and not p.proretset
        and p.prosecdef and l.lanname = 'plpgsql'
    ) then
      raise exception '180: unexpected function shape for %. No changes committed.', target.signature;
    end if;

    select p.prosrc, pg_get_functiondef(p.oid), to_jsonb(p) - 'prosrc'
      into original_source, original_definition, original_metadata
      from pg_proc p where p.oid = function_oid;
    old_count := (length(original_source) - length(replace(original_source, target.old_comparison, '')))
      / length(target.old_comparison);
    new_count := (length(original_source) - length(replace(original_source, target.new_comparison, '')))
      / length(target.new_comparison);

    -- 재실행 시 이미 적용된 함수는 그대로 둡니다.
    if old_count = 0 and new_count = 1 then
      continue;
    end if;
    if old_count <> 1 or new_count <> 0 then
      raise exception '180: unexpected date condition for %. No changes committed.', target.signature;
    end if;

    expected_source := replace(original_source, target.old_comparison, target.new_comparison);
    execute replace(original_definition, target.old_comparison, target.new_comparison);

    -- 본문은 지정한 비교 한 곳만 변경되고 소유자/권한/보안 설정은 보존되어야 합니다.
    if not exists (
      select 1 from pg_proc p where p.oid = function_oid
        and p.prosrc = expected_source
        and to_jsonb(p) - 'prosrc' = original_metadata
    ) then
      raise exception '180: unexpected function change for %. No changes committed.', target.signature;
    end if;
  end loop;
end;
$roots180$;

commit;

-- 아래 여섯 항목이 모두 true이면 정상입니다. 보상을 실제로 지급하는 테스트는 아닙니다.
select
  exists (
    select 1 from pg_proc where oid = to_regprocedure('public.claim_personal_challenge_rewards(date)')
      and position('c.end_date < p_today' in prosrc) > 0
      and position('c.end_date <= p_today' in prosrc) = 0
  ) as personal_awards_start_next_day,
  exists (
    select 1 from pg_proc where oid = to_regprocedure('public.get_personal_challenge_status(date)')
      and position('p_today > v_campaign.end_date' in prosrc) > 0
      and position('p_today >= v_campaign.end_date' in prosrc) = 0
  ) as personal_claim_status_start_next_day,
  exists (
    select 1 from pg_proc where oid = to_regprocedure('public.sync_personal_challenge(date,uuid)')
      and position('perform public.claim_personal_challenge_rewards(p_today)' in prosrc) > 0
  ) as home_sync_uses_same_award_rule,
  exists (
    select 1 from public.personal_reflection_challenges
      where id = 'november-2026-gratitude' and end_date = date '2026-11-19'
        and not (end_date < date '2026-11-19')
  ) as november_19_award_blocked,
  exists (
    select 1 from public.personal_reflection_challenges
      where id = 'november-2026-gratitude' and end_date = date '2026-11-19'
        and end_date < date '2026-11-20'
  ) as november_20_date_eligible,
  (
    has_function_privilege('authenticated', 'public.claim_personal_challenge_rewards(date)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_personal_challenge_status(date)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.claim_personal_challenge_rewards(date)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_personal_challenge_status(date)', 'EXECUTE')
  ) as authenticated_access_preserved;
