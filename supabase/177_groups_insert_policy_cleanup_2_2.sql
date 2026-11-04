-- Roots 2.2 / 177. 176 완료 후 SQL Editor에서 파일 전체를 한 번에 실행하세요.
-- 새 그룹 생성 시 로그인한 본인이 최초 그룹장이어야 한다는 규칙을 하나로 합칩니다.
-- 그룹장 위임은 기존 그룹을 갱신하는 별도의 경로입니다.
-- 대상 테이블이 사용 중이거나 정책 구성이 예상과 다르면 변경 전에 중단합니다.

begin;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '250ms';
set local statement_timeout = '5s';
set local idle_in_transaction_session_timeout = '10s';

do $roots177$
declare
  original_check constant text := '(auth.uid() = created_by)';
  optimized_check constant text := '(( SELECT auth.uid() AS uid) = created_by)';
  original_rules constant jsonb := jsonb_build_object(
    'groups_insert', original_check, '로그인 유저 그룹 생성', original_check
  );
  final_rules constant jsonb := jsonb_build_object('groups_insert', optimized_check);
  current_rules jsonb;
  expected_shape boolean;
  pass integer;
begin
  lock table only public.groups in access exclusive mode nowait;

  if not (select relrowsecurity from pg_class where oid = 'public.groups'::regclass)
     or not exists (
       select 1 from pg_proc where oid = 'auth.uid()'::regprocedure
         and provolatile = 's' and not proretset and prorettype = 'uuid'::regtype
     ) then
    raise exception '177: unexpected groups RLS or auth.uid() definition';
  end if;

  -- Check the original state under the lock, then verify the result before committing.
  -- A rerun matching the final state finishes on the first pass.
  for pass in 1..2 loop
    select jsonb_object_agg(policyname, with_check),
           bool_and(cmd = 'INSERT' and permissive = 'PERMISSIVE'
                    and roles = array['public']::name[] and qual is null)
      into current_rules, expected_shape
      from pg_policies
     where schemaname = 'public' and tablename = 'groups'
       and (cmd in ('INSERT', 'ALL')
            or policyname in ('groups_insert', '로그인 유저 그룹 생성'));

    if expected_shape is true and current_rules = final_rules then
      return;
    end if;
    if pass = 2 or expected_shape is distinct from true
       or current_rules is distinct from original_rules then
      raise exception '177: unexpected groups creation policies. No changes committed.';
    end if;

    alter policy groups_insert on public.groups
      with check ((select auth.uid()) = created_by);
    drop policy "로그인 유저 그룹 생성" on public.groups;
  end loop;
end;
$roots177$;

commit;

-- 설정 확인 5개. 정상 결과는 한 행, 모두 true입니다.
select
  (select count(*) = 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and cmd in ('INSERT', 'ALL')) as single_create_policy,
  exists (select 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'groups_insert' and cmd = 'INSERT'
      and permissive = 'PERMISSIVE' and roles = array['public']::name[] and qual is null
      and with_check = '(( SELECT auth.uid() AS uid) = created_by)') as creator_check_optimized,
  (select relrowsecurity from pg_catalog.pg_class
    where oid = 'public.groups'::regclass) as group_rls_enabled,
  exists (select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.groups'::regclass and conname = 'roots_groups_private_only'
      and convalidated and pg_catalog.pg_get_constraintdef(oid) = 'CHECK ((is_public IS FALSE))'
  ) as private_groups_enforced,
  pg_catalog.to_regprocedure('public.transfer_group_leadership_as_leader(uuid,uuid,uuid)')
    is not null as transfer_function_present;
