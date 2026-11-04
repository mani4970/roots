-- Christian Roots 2.2 / 176: auxiliary RLS auth initplan optimization.
-- 175 적용 완료 후 실행. 앱 소스는 수정하지 않습니다.
-- 대상: feedback / content_reports / hidden_community_users / companion_preferences.
-- 정책 9개의 auth.uid()를 (select auth.uid())로만 변경합니다.
-- 역할, 동역자 관계 조건, 공개 범위, 함수, 권한, 기존 데이터는 그대로입니다.
-- feedback INSERT의 기존 "로그인 여부" 조건도 그대로 유지합니다.
-- DROP/CREATE POLICY, GRANT/REVOKE, 테이블/행 변경은 없습니다.
-- 전체를 한 번 실행하세요. 성공하면 아래 결과 8개가 모두 true입니다.
-- 테이블이 사용 중이면 NOWAIT로 중단합니다. 55P03/시간 초과가 나면
-- 적용 실패 상태이므로 결과를 전달해주세요. 정책을 따로 실행하지 마세요.
-- 실행 전후 정책이 확인한 상태와 다르거나 검증이 실패하면 전부 취소됩니다.

begin;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '250ms';
set local statement_timeout = '5s';
set local idle_in_transaction_session_timeout = '10s';

do $roots176$
declare
  expected_before constant jsonb := $before176$[{"cmd":"DELETE","qual":"(auth.uid() = user_id)","roles":["authenticated"],"tablename":"companion_preferences","permissive":"PERMISSIVE","policyname":"companion_preferences_delete_own","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"companion_preferences","permissive":"PERMISSIVE","policyname":"companion_preferences_insert_own_partner","schemaname":"public","with_check":"((auth.uid() = user_id) AND (EXISTS ( SELECT 1\n   FROM companions c\n  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = auth.uid()) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = auth.uid()) AND (c.requester_id = companion_preferences.companion_user_id)))))))"},{"cmd":"SELECT","qual":"(auth.uid() = user_id)","roles":["authenticated"],"tablename":"companion_preferences","permissive":"PERMISSIVE","policyname":"companion_preferences_select_own","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"(auth.uid() = user_id)","roles":["authenticated"],"tablename":"companion_preferences","permissive":"PERMISSIVE","policyname":"companion_preferences_update_own_partner","schemaname":"public","with_check":"((auth.uid() = user_id) AND (EXISTS ( SELECT 1\n   FROM companions c\n  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = auth.uid()) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = auth.uid()) AND (c.requester_id = companion_preferences.companion_user_id)))))))"},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"content_reports","permissive":"PERMISSIVE","policyname":"Users can create their own reports","schemaname":"public","with_check":"(auth.uid() = reporter_id)"},{"cmd":"SELECT","qual":"(auth.uid() = reporter_id)","roles":["authenticated"],"tablename":"content_reports","permissive":"PERMISSIVE","policyname":"Users can read their own reports","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["public"],"tablename":"feedback","permissive":"PERMISSIVE","policyname":"feedback_insert","schemaname":"public","with_check":"(auth.uid() IS NOT NULL)"},{"cmd":"SELECT","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"feedback","permissive":"PERMISSIVE","policyname":"feedback_select","schemaname":"public","with_check":null},{"cmd":"ALL","qual":"(auth.uid() = user_id)","roles":["authenticated"],"tablename":"hidden_community_users","permissive":"PERMISSIVE","policyname":"Users can manage their hidden community users","schemaname":"public","with_check":"(auth.uid() = user_id)"}]$before176$::jsonb;
  expected_after constant jsonb := $after176$[{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_delete_own","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":null},{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_insert_own_partner","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1\n   FROM companions c\n  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = ( SELECT auth.uid() AS uid)) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = ( SELECT auth.uid() AS uid)) AND (c.requester_id = companion_preferences.companion_user_id)))))))"},{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_select_own","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":null},{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_update_own_partner","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"UPDATE","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":"((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1\n   FROM companions c\n  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = ( SELECT auth.uid() AS uid)) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = ( SELECT auth.uid() AS uid)) AND (c.requester_id = companion_preferences.companion_user_id)))))))"},{"schemaname":"public","tablename":"content_reports","policyname":"Users can create their own reports","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"(( SELECT auth.uid() AS uid) = reporter_id)"},{"schemaname":"public","tablename":"content_reports","policyname":"Users can read their own reports","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"(( SELECT auth.uid() AS uid) = reporter_id)","with_check":null},{"schemaname":"public","tablename":"feedback","policyname":"feedback_insert","permissive":"PERMISSIVE","roles":["public"],"cmd":"INSERT","qual":null,"with_check":"(( SELECT auth.uid() AS uid) IS NOT NULL)"},{"schemaname":"public","tablename":"feedback","policyname":"feedback_select","permissive":"PERMISSIVE","roles":["public"],"cmd":"SELECT","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":null},{"schemaname":"public","tablename":"hidden_community_users","policyname":"Users can manage their hidden community users","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"ALL","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":"(( SELECT auth.uid() AS uid) = user_id)"}]$after176$::jsonb;
  expected_companions constant jsonb := $companions176$[{"cmd":"DELETE","qual":"((auth.uid() = requester_id) OR (auth.uid() = receiver_id))","roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_delete_own","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_insert_own_request","schemaname":"public","with_check":"((requester_id <> receiver_id) AND (((auth.uid() = requester_id) AND (status = 'pending'::text)) OR ((auth.uid() = receiver_id) AND (status = 'accepted'::text))))"},{"cmd":"SELECT","qual":"((auth.uid() = requester_id) OR (auth.uid() = receiver_id))","roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_select_own","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"(auth.uid() = receiver_id)","roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_update_received_request","schemaname":"public","with_check":"(auth.uid() = receiver_id)"}]$companions176$::jsonb;
  actual jsonb;
  unchanged_before jsonb;
begin
  if to_regclass('public.feedback') is null
    or to_regclass('public.content_reports') is null
    or to_regclass('public.hidden_community_users') is null
    or to_regclass('public.companion_preferences') is null
    or to_regclass('public.companions') is null
    or to_regprocedure('auth.uid()') is null
  then raise exception '176 safety stop: expected tables/auth helper are missing'; end if;

  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname in ('feedback','content_reports','hidden_community_users','companion_preferences','companions')
        and not c.relrowsecurity)
    or not exists (select 1 from pg_proc p where p.oid='auth.uid()'::regprocedure and p.provolatile='s' and not p.prosecdef and not p.proretset and p.prorettype='uuid'::regtype and p.proconfig is null and md5(p.prosrc)='cdef18c69c4f4cbbced2eaf81e628b49')
    or (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename='companions') is distinct from expected_companions
  then raise exception '176 safety stop: RLS, auth helper or companion rules changed'; end if;

  select (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename in ('companion_preferences','content_reports','feedback','hidden_community_users')) into actual;
  if actual is distinct from expected_before and actual is distinct from expected_after then
    raise exception '176 safety stop: target policies differ from the reviewed state';
  end if;

  select (select jsonb_build_object(
    'functions', (select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid) || coalesce(p.proacl::text,''),'' order by p.oid),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' or p.oid='auth.uid()'::regprocedure) and p.prokind in ('f','p')),
    'other_policies', (select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by p.schemaname,p.tablename,p.policyname),'')) from pg_policies p where not (p.schemaname='public' and p.tablename in ('companion_preferences','content_reports','feedback','hidden_community_users'))),
    'tables_grants_rls', (select md5(coalesce(string_agg(c.oid::text || c.relowner::text || coalesce(c.relacl::text,'') || c.relrowsecurity::text || c.relforcerowsecurity::text,'' order by c.oid),'')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
    'triggers', (select md5(coalesce(string_agg(t.oid::text || pg_get_triggerdef(t.oid) || t.tgenabled::text,'' order by t.oid),'')) from pg_trigger t where not t.tgisinternal),
    'constraints', (select md5(coalesce(string_agg(k.oid::text || pg_get_constraintdef(k.oid),'' order by k.oid),'')) from pg_constraint k join pg_namespace n on n.oid=k.connamespace where n.nspname='public'),
    'policy_identity', (select md5(string_agg(p.oid::text || p.polname::text || p.polcmd::text || p.polroles::text || p.polpermissive::text,'' order by p.oid)) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('companion_preferences','content_reports','feedback','hidden_community_users'))
  )) into unchanged_before;

  if actual is distinct from expected_after then
    -- ALTER POLICY itself requires ACCESS EXCLUSIVE. Take all four locks with
    -- NOWAIT, rather than queuing behind users' active reads/writes.
    -- A busy table aborts the entire statement/transaction without a partial patch.
    lock table public.companion_preferences, public.content_reports,
      public.feedback, public.hidden_community_users in access exclusive mode nowait;

    -- Recheck after locking in case another session changed policies meanwhile.
    select (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename in ('companion_preferences','content_reports','feedback','hidden_community_users')) into actual;
    if actual is distinct from expected_before and actual is distinct from expected_after then
      raise exception '176 safety stop: target policies changed before lock acquisition';
    end if;

    alter policy "companion_preferences_delete_own" on public.companion_preferences
      using (((select auth.uid()) = user_id));

    alter policy "companion_preferences_insert_own_partner" on public.companion_preferences
      with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM companions c
  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = (select auth.uid())) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = (select auth.uid())) AND (c.requester_id = companion_preferences.companion_user_id))))))));

    alter policy "companion_preferences_select_own" on public.companion_preferences
      using (((select auth.uid()) = user_id));

    alter policy "companion_preferences_update_own_partner" on public.companion_preferences
      using (((select auth.uid()) = user_id))
      with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM companions c
  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = (select auth.uid())) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = (select auth.uid())) AND (c.requester_id = companion_preferences.companion_user_id))))))));

    alter policy "Users can create their own reports" on public.content_reports
      with check (((select auth.uid()) = reporter_id));

    alter policy "Users can read their own reports" on public.content_reports
      using (((select auth.uid()) = reporter_id));

    alter policy "feedback_insert" on public.feedback
      with check (((select auth.uid()) IS NOT NULL));

    alter policy "feedback_select" on public.feedback
      using (((select auth.uid()) = user_id));

    alter policy "Users can manage their hidden community users" on public.hidden_community_users
      using (((select auth.uid()) = user_id))
      with check (((select auth.uid()) = user_id));
  end if;

  select (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename in ('companion_preferences','content_reports','feedback','hidden_community_users')) into actual;
  if not (actual = expected_after) then
    raise exception '176 postcheck failed: policy expressions differ from expected';
  end if;
  if (select jsonb_build_object(
    'functions', (select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid) || coalesce(p.proacl::text,''),'' order by p.oid),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' or p.oid='auth.uid()'::regprocedure) and p.prokind in ('f','p')),
    'other_policies', (select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by p.schemaname,p.tablename,p.policyname),'')) from pg_policies p where not (p.schemaname='public' and p.tablename in ('companion_preferences','content_reports','feedback','hidden_community_users'))),
    'tables_grants_rls', (select md5(coalesce(string_agg(c.oid::text || c.relowner::text || coalesce(c.relacl::text,'') || c.relrowsecurity::text || c.relforcerowsecurity::text,'' order by c.oid),'')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
    'triggers', (select md5(coalesce(string_agg(t.oid::text || pg_get_triggerdef(t.oid) || t.tgenabled::text,'' order by t.oid),'')) from pg_trigger t where not t.tgisinternal),
    'constraints', (select md5(coalesce(string_agg(k.oid::text || pg_get_constraintdef(k.oid),'' order by k.oid),'')) from pg_constraint k join pg_namespace n on n.oid=k.connamespace where n.nspname='public'),
    'policy_identity', (select md5(string_agg(p.oid::text || p.polname::text || p.polcmd::text || p.polroles::text || p.polpermissive::text,'' order by p.oid)) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('companion_preferences','content_reports','feedback','hidden_community_users'))
  )) is distinct from unchanged_before then
    raise exception '176 postcheck failed: policy identity, unrelated rules, grants or functions changed';
  end if;
end;
$roots176$;

commit;

-- Configuration checks: all eight values should be true.
select
  (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename='feedback') = $table176$[{"schemaname":"public","tablename":"feedback","policyname":"feedback_insert","permissive":"PERMISSIVE","roles":["public"],"cmd":"INSERT","qual":null,"with_check":"(( SELECT auth.uid() AS uid) IS NOT NULL)"},{"schemaname":"public","tablename":"feedback","policyname":"feedback_select","permissive":"PERMISSIVE","roles":["public"],"cmd":"SELECT","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":null}]$table176$::jsonb as feedback_ready,
  (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename='content_reports') = $table176$[{"schemaname":"public","tablename":"content_reports","policyname":"Users can create their own reports","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"(( SELECT auth.uid() AS uid) = reporter_id)"},{"schemaname":"public","tablename":"content_reports","policyname":"Users can read their own reports","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"(( SELECT auth.uid() AS uid) = reporter_id)","with_check":null}]$table176$::jsonb as reports_ready,
  (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename='hidden_community_users') = $table176$[{"schemaname":"public","tablename":"hidden_community_users","policyname":"Users can manage their hidden community users","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"ALL","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":"(( SELECT auth.uid() AS uid) = user_id)"}]$table176$::jsonb as hidden_users_ready,
  (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename='companion_preferences') = $table176$[{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_delete_own","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":null},{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_insert_own_partner","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1\n   FROM companions c\n  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = ( SELECT auth.uid() AS uid)) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = ( SELECT auth.uid() AS uid)) AND (c.requester_id = companion_preferences.companion_user_id)))))))"},{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_select_own","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":null},{"schemaname":"public","tablename":"companion_preferences","policyname":"companion_preferences_update_own_partner","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"UPDATE","qual":"(( SELECT auth.uid() AS uid) = user_id)","with_check":"((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1\n   FROM companions c\n  WHERE ((c.status = 'accepted'::text) AND (((c.requester_id = ( SELECT auth.uid() AS uid)) AND (c.receiver_id = companion_preferences.companion_user_id)) OR ((c.receiver_id = ( SELECT auth.uid() AS uid)) AND (c.requester_id = companion_preferences.companion_user_id)))))))"}]$table176$::jsonb as companion_preferences_ready,
  (select count(*)=9 from pg_policies p where p.schemaname='public' and p.tablename in ('companion_preferences','content_reports','feedback','hidden_community_users')) as nine_policies_preserved,
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('feedback','content_reports','hidden_community_users','companion_preferences','companions')) as rls_preserved,
  (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p where p.schemaname='public' and p.tablename='companions') = $companions176$[{"cmd":"DELETE","qual":"((auth.uid() = requester_id) OR (auth.uid() = receiver_id))","roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_delete_own","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_insert_own_request","schemaname":"public","with_check":"((requester_id <> receiver_id) AND (((auth.uid() = requester_id) AND (status = 'pending'::text)) OR ((auth.uid() = receiver_id) AND (status = 'accepted'::text))))"},{"cmd":"SELECT","qual":"((auth.uid() = requester_id) OR (auth.uid() = receiver_id))","roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_select_own","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"(auth.uid() = receiver_id)","roles":["authenticated"],"tablename":"companions","permissive":"PERMISSIVE","policyname":"companions_update_received_request","schemaname":"public","with_check":"(auth.uid() = receiver_id)"}]$companions176$::jsonb as companion_rules_preserved,
  (select p.provolatile='s' and not p.prosecdef and not p.proretset and p.prorettype='uuid'::regtype and p.proconfig is null and md5(p.prosrc)='cdef18c69c4f4cbbced2eaf81e628b49' from pg_proc p where p.oid='auth.uid()'::regprocedure) as auth_helper_preserved;
