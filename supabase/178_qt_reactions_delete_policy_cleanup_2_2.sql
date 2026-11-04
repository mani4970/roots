-- Roots 2.2 / 178. 177 완료 후 SQL Editor에서 파일 전체를 한 번에 실행하세요.
-- 말씀 묵상에서 내 반응을 취소할 때 적용되는 동일한 DELETE 규칙 두 개를 하나로 합칩니다.
-- 동역자에게 공유된 묵상의 별도 규칙을 함께 점검합니다. 실제 묵상이나 반응 데이터는 수정하지 않습니다.
-- 잠금을 즉시 확보할 수 없거나 정책 구성이 예상과 다르면 중단합니다.

begin;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '250ms';
set local statement_timeout = '5s';
set local idle_in_transaction_session_timeout = '10s';

do $roots178$
declare
  original_qual constant text := '(auth.uid() = user_id)';
  optimized_qual constant text := '(( SELECT auth.uid() AS uid) = user_id)';
  recipient_name constant text := 'qt_reactions_delete_partner_recipient_qt';
  recipient_qual constant text := $qual$((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM qt_record_recipients r
  WHERE ((r.qt_record_id = qt_reactions.qt_id) AND (r.recipient_id = auth.uid())))))$qual$;
  original_rules constant jsonb := jsonb_build_object(
    'qt_reactions_delete', original_qual, 'qt_reactions 삭제', original_qual, recipient_name, recipient_qual
  );
  final_rules constant jsonb := jsonb_build_object(
    'qt_reactions_delete', optimized_qual, recipient_name, recipient_qual
  );
  current_rules jsonb;
  shapes_match boolean;
  other_before jsonb;
  other_now jsonb;
begin
  lock table only public.qt_reactions in access exclusive mode nowait;
  if not (select relrowsecurity from pg_class where oid = 'public.qt_reactions'::regclass)
     or not exists (
       select 1 from pg_proc where oid = 'auth.uid()'::regprocedure
         and provolatile = 's' and not proretset and prorettype = 'uuid'::regtype
     ) then
    raise exception '178: unexpected qt_reactions RLS or auth.uid() definition';
  end if;

  -- Verify both the original and final states under the same table lock.
  for pass in 1..2 loop
    with rules as (
      select p.*, (cmd in ('DELETE', 'ALL') or policyname in
        ('qt_reactions_delete', 'qt_reactions 삭제', recipient_name)) as in_scope
      from pg_policies p where schemaname = 'public' and tablename = 'qt_reactions'
    )
    select jsonb_object_agg(policyname, qual) filter (where in_scope),
           bool_and(cmd = 'DELETE' and permissive = 'PERMISSIVE' and with_check is null and
             roles = case when policyname = recipient_name then array['authenticated']::name[]
                          else array['public']::name[] end) filter (where in_scope),
           jsonb_agg(to_jsonb(r) order by policyname)
             filter (where policyname not in ('qt_reactions_delete', 'qt_reactions 삭제'))
      into current_rules, shapes_match, other_now
      from rules r;

    if pass = 1 then
      other_before := other_now;
    elsif other_before is distinct from other_now then
      raise exception '178: an unrelated qt_reactions policy changed';
    end if;
    if shapes_match is true and current_rules = final_rules then
      return;
    end if;
    if pass = 2 or shapes_match is distinct from true or current_rules is distinct from original_rules then
      raise exception '178: unexpected reaction deletion policies. No changes committed.';
    end if;

    alter policy qt_reactions_delete on public.qt_reactions using ((select auth.uid()) = user_id);
    drop policy "qt_reactions 삭제" on public.qt_reactions;
  end loop;
end;
$roots178$;

commit;

-- 설정 확인 다섯 항목이 모두 true이면 정상입니다.
with policies as (
  select * from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'qt_reactions'
)
select
  (select count(*) = 2 from policies where cmd in ('DELETE', 'ALL')) as two_delete_rules,
  not exists (select 1 from policies where policyname = 'qt_reactions 삭제') as duplicate_removed,
  exists (select 1 from policies where policyname = 'qt_reactions_delete' and cmd = 'DELETE'
    and permissive = 'PERMISSIVE' and roles = array['public']::name[] and with_check is null
    and qual = '(( SELECT auth.uid() AS uid) = user_id)') as own_delete_optimized,
  exists (select 1 from policies where policyname = 'qt_reactions_delete_partner_recipient_qt'
    and cmd = 'DELETE' and permissive = 'PERMISSIVE' and roles = array['authenticated']::name[]
    and with_check is null) as recipient_delete_rule_present,
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.qt_reactions'::regclass)
    as reaction_rls_enabled;
