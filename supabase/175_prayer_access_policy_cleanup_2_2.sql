-- Christian Roots 2.2 / 175: prayer access policy cleanup.
-- 기준: roots_safe_current_20261103_1913(1).zip + 2026-11-03 운영 정책 확인.
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행합니다.
-- 적용 대상: prayer_items, prayer_likes, user_prayer_logs의 RLS 정책만.
-- 기존 기도/중보기도/좋아요/공유 대상/보상 데이터는 수정하거나 삭제하지 않습니다.
-- 보상, 카운트, 묵상 완료, 출석, 초안, 프로필 함수 및 앱 코드는 변경하지 않습니다.
-- 전체 공개 기도는 계속 비공개 처리됩니다. 기존 all 값은 과거 기록 호환용입니다.
-- 기존 정책이 예상과 다르면 전부 취소됩니다. 173/174를 다시 실행하지 마세요.
-- 되돌리기는 별도 rollback/175_prayer_access_policy_cleanup_2_2_rollback.sql입니다.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local search_path = pg_catalog, public, pg_temp;

-- Bound concurrent policy changes. No user rows are locked/rewritten individually.
lock table public.prayer_items, public.prayer_likes, public.user_prayer_logs
  in share row exclusive mode;

do $prayer175_pre$
declare actual jsonb;
begin
  if to_regclass('roots_prayer_173_private.legacy_intercessions') is null
    or to_regclass('public.prayer_item_recipients') is null
    or to_regprocedure('public.can_view_prayer_item(text,uuid)') is null
    or to_regprocedure('public.can_share_prayer_visibility(text)') is null
    or to_regprocedure('public.can_view_legacy_prayer_intercession(uuid)') is null
  then raise exception '175 safety stop: required prayer sharing objects are missing'; end if;

  if exists (
    select 1 from pg_class c where c.oid in (
      'public.prayer_items'::regclass, 'public.prayer_likes'::regclass,
      'public.user_prayer_logs'::regclass, 'public.prayer_item_recipients'::regclass,
      'roots_prayer_173_private.legacy_intercessions'::regclass
    ) and not c.relrowsecurity
  ) or has_schema_privilege('authenticated','roots_prayer_173_private','USAGE')
    or has_schema_privilege('anon','roots_prayer_173_private','USAGE')
    or has_table_privilege('authenticated','roots_prayer_173_private.legacy_intercessions','SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('anon','roots_prayer_173_private.legacy_intercessions','SELECT,INSERT,UPDATE,DELETE')
    or exists (
      select 1 from pg_proc p where p.oid in (
        'public.can_view_prayer_item(text,uuid)'::regprocedure,
        'public.can_share_prayer_visibility(text)'::regprocedure,
        'public.can_view_legacy_prayer_intercession(uuid)'::regprocedure
      ) and (not p.prosecdef or pg_get_userbyid(p.proowner) <> 'postgres'
        or not has_function_privilege('authenticated',p.oid,'EXECUTE')
        or has_function_privilege('anon',p.oid,'EXECUTE'))
    )
  then raise exception '175 safety stop: prayer RLS/helper/archive protection needs review'; end if;

  if (
    select jsonb_agg(jsonb_build_object(
      'proname',p.proname,'args',pg_get_function_identity_arguments(p.oid),
      'source_md5',md5(p.prosrc),'proconfig',p.proconfig,
      'provolatile',p.provolatile,'prosecdef',p.prosecdef,
      'owner',pg_get_userbyid(p.proowner),'lanname',l.lanname
    ) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    join pg_language l on l.oid=p.prolang
    where n.nspname='public' and p.proname in (
      'can_view_prayer_item','can_share_prayer_visibility','can_view_legacy_prayer_intercession'
    )
  ) is distinct from $prayer175_helpers$[{"proname":"can_share_prayer_visibility","args":"p_visibility text","source_md5":"26d90548a056c372e204c25cace08eae","proconfig":["search_path=\"\""],"provolatile":"s","prosecdef":true,"owner":"postgres","lanname":"plpgsql"},{"proname":"can_view_legacy_prayer_intercession","args":"p_prayer_id uuid","source_md5":"eff52c3e79c2b1ac2e36accfc62cf257","proconfig":["search_path=\"\""],"provolatile":"s","prosecdef":true,"owner":"postgres","lanname":"sql"},{"proname":"can_view_prayer_item","args":"p_visibility text, p_owner_id uuid","source_md5":"84d50831b3b0a84b035cabcc9390309b","proconfig":["search_path=\"\""],"provolatile":"s","prosecdef":true,"owner":"postgres","lanname":"sql"}]$prayer175_helpers$::jsonb then
    raise exception '175 safety stop: reviewed prayer helper definitions/settings changed';
  end if;


  select (select coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]'::jsonb) from pg_policies p where p.schemaname = 'public' and p.tablename in ('prayer_items','prayer_likes','user_prayer_logs')) into actual;
  if not (actual = $prayer175_original$[{"cmd":"DELETE","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"prayer_items_delete","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["public"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"prayer_items_insert","schemaname":"public","with_check":"(auth.uid() = user_id)"},{"cmd":"SELECT","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"prayer_items_select","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"can_view_legacy_prayer_intercession(id)","roles":["authenticated"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"prayer_items_select_legacy_intercession","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"(EXISTS ( SELECT 1\n   FROM prayer_item_recipients r\n  WHERE ((r.prayer_item_id = prayer_items.id) AND (r.recipient_id = auth.uid()))))","roles":["authenticated"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"prayer_items_select_partner_recipients","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["public"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"prayer_write","schemaname":"public","with_check":"(auth.uid() = user_id)"},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"roots_prayer_items_insert_own","schemaname":"public","with_check":"((user_id = auth.uid()) AND can_share_prayer_visibility(visibility))"},{"cmd":"SELECT","qual":"can_view_prayer_item(visibility, user_id)","roles":["authenticated"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"roots_prayer_items_select_visible","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"(user_id = auth.uid())","roles":["authenticated"],"tablename":"prayer_items","permissive":"PERMISSIVE","policyname":"roots_prayer_items_update_owner","schemaname":"public","with_check":"((user_id = auth.uid()) AND can_share_prayer_visibility(visibility))"},{"cmd":"SELECT","qual":"true","roles":["authenticated"],"tablename":"prayer_likes","permissive":"PERMISSIVE","policyname":"Authenticated users can read prayer likes","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"prayer_likes","permissive":"PERMISSIVE","policyname":"Users can like prayers as themselves","schemaname":"public","with_check":"(auth.uid() = user_id)"},{"cmd":"DELETE","qual":"(auth.uid() = user_id)","roles":["authenticated"],"tablename":"prayer_likes","permissive":"PERMISSIVE","policyname":"Users can remove their own prayer likes","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"prayer_likes","permissive":"PERMISSIVE","policyname":"roots_prayer_likes_insert_own_visible_answered_prayer","schemaname":"public","with_check":"((user_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = prayer_likes.prayer_id) AND (pi.is_answered = true) AND can_view_prayer_item(pi.visibility, pi.user_id)))))"},{"cmd":"SELECT","qual":"(EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = prayer_likes.prayer_id) AND (pi.is_answered = true) AND can_view_prayer_item(pi.visibility, pi.user_id))))","roles":["authenticated"],"tablename":"prayer_likes","permissive":"PERMISSIVE","policyname":"roots_prayer_likes_select_visible_answered_prayer","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"roots_user_prayer_logs_insert_own_for_visible_prayer","schemaname":"public","with_check":"((user_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = user_prayer_logs.prayer_id) AND can_view_prayer_item(pi.visibility, pi.user_id)))))"},{"cmd":"SELECT","qual":"((user_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = user_prayer_logs.prayer_id) AND can_view_prayer_item(pi.visibility, pi.user_id)))))","roles":["authenticated"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"roots_user_prayer_logs_select_related","schemaname":"public","with_check":null},{"cmd":"DELETE","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"user_prayer_logs_delete","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["public"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"user_prayer_logs_insert","schemaname":"public","with_check":"(auth.uid() = user_id)"},{"cmd":"SELECT","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"user_prayer_logs_select","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"기도 로그 조회","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["public"],"tablename":"user_prayer_logs","permissive":"PERMISSIVE","policyname":"기도 로그 추가","schemaname":"public","with_check":"(auth.uid() = user_id)"}]$prayer175_original$::jsonb
    or (actual = $prayer175_final$[{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_delete","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":null},{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_insert","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND can_share_prayer_visibility(visibility))"},{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_select","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"(can_view_prayer_item(visibility, user_id) OR (EXISTS ( SELECT 1\n   FROM prayer_item_recipients r\n  WHERE ((r.prayer_item_id = prayer_items.id) AND (r.recipient_id = ( SELECT auth.uid() AS uid))))) OR can_view_legacy_prayer_intercession(id))","with_check":null},{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_update","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"UPDATE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND can_share_prayer_visibility(visibility))"},{"schemaname":"public","tablename":"prayer_likes","policyname":"roots_prayer175_likes_delete","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":null},{"schemaname":"public","tablename":"prayer_likes","policyname":"roots_prayer175_likes_insert","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = prayer_likes.prayer_id) AND (pi.is_answered = true)))))"},{"schemaname":"public","tablename":"prayer_likes","policyname":"roots_prayer175_likes_select","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = prayer_likes.prayer_id) AND (pi.is_answered = true)))))","with_check":null},{"schemaname":"public","tablename":"user_prayer_logs","policyname":"roots_prayer175_logs_delete","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":null},{"schemaname":"public","tablename":"user_prayer_logs","policyname":"roots_prayer175_logs_insert","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE (pi.id = user_prayer_logs.prayer_id))))"},{"schemaname":"public","tablename":"user_prayer_logs","policyname":"roots_prayer175_logs_select","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = user_prayer_logs.prayer_id) AND can_view_prayer_item(pi.visibility, pi.user_id)))))","with_check":null}]$prayer175_final$::jsonb)) then
    raise exception '175 safety stop: prayer policies differ from the reviewed snapshot';
  end if;
  perform set_config('roots.prayer175_functions', (select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid) || coalesce(p.proacl::text,''), '' order by p.oid),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','roots_prayer_173_private') and p.prokind in ('f','p')), true);
  perform set_config('roots.prayer175_other_policies', (select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by p.schemaname,p.tablename,p.policyname),'')) from pg_policies p where not (p.schemaname = 'public' and p.tablename in ('prayer_items','prayer_likes','user_prayer_logs'))), true);
  perform set_config('roots.prayer175_triggers', (select md5(coalesce(string_agg(t.oid::text || pg_get_triggerdef(t.oid),'' order by t.oid),'')) from pg_trigger t where not t.tgisinternal), true);
  perform set_config('roots.prayer175_grants', (select md5(coalesce(string_agg(c.oid::text || coalesce(c.relacl::text,'') || c.relrowsecurity::text || c.relforcerowsecurity::text,'' order by c.oid),'')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','roots_prayer_173_private') and c.relkind in ('r','p')), true);
end;
$prayer175_pre$;

drop policy if exists "prayer_items_delete" on public.prayer_items;
drop policy if exists "prayer_items_insert" on public.prayer_items;
drop policy if exists "prayer_items_select" on public.prayer_items;
drop policy if exists "prayer_items_select_legacy_intercession" on public.prayer_items;
drop policy if exists "prayer_items_select_partner_recipients" on public.prayer_items;
drop policy if exists "prayer_write" on public.prayer_items;
drop policy if exists "roots_prayer175_items_delete" on public.prayer_items;
drop policy if exists "roots_prayer175_items_insert" on public.prayer_items;
drop policy if exists "roots_prayer175_items_select" on public.prayer_items;
drop policy if exists "roots_prayer175_items_update" on public.prayer_items;
drop policy if exists "roots_prayer_items_insert_own" on public.prayer_items;
drop policy if exists "roots_prayer_items_select_visible" on public.prayer_items;
drop policy if exists "roots_prayer_items_update_owner" on public.prayer_items;
drop policy if exists "Authenticated users can read prayer likes" on public.prayer_likes;
drop policy if exists "Users can like prayers as themselves" on public.prayer_likes;
drop policy if exists "Users can remove their own prayer likes" on public.prayer_likes;
drop policy if exists "roots_prayer175_likes_delete" on public.prayer_likes;
drop policy if exists "roots_prayer175_likes_insert" on public.prayer_likes;
drop policy if exists "roots_prayer175_likes_select" on public.prayer_likes;
drop policy if exists "roots_prayer_likes_insert_own_visible_answered_prayer" on public.prayer_likes;
drop policy if exists "roots_prayer_likes_select_visible_answered_prayer" on public.prayer_likes;
drop policy if exists "roots_prayer175_logs_delete" on public.user_prayer_logs;
drop policy if exists "roots_prayer175_logs_insert" on public.user_prayer_logs;
drop policy if exists "roots_prayer175_logs_select" on public.user_prayer_logs;
drop policy if exists "roots_user_prayer_logs_insert_own_for_visible_prayer" on public.user_prayer_logs;
drop policy if exists "roots_user_prayer_logs_select_related" on public.user_prayer_logs;
drop policy if exists "user_prayer_logs_delete" on public.user_prayer_logs;
drop policy if exists "user_prayer_logs_insert" on public.user_prayer_logs;
drop policy if exists "user_prayer_logs_select" on public.user_prayer_logs;
drop policy if exists "기도 로그 조회" on public.user_prayer_logs;
drop policy if exists "기도 로그 추가" on public.user_prayer_logs;

-- One policy per operation; the SELECT union preserves every current reader.
-- For likes/log INSERT the prayer_items subquery uses its full normal RLS:
-- owner, selected companion, group member or fixed legacy reader.
-- Do not add the owner/group-only helper again to those INSERT checks.
-- Own historical likes remain readable/removable after sharing is withdrawn.
-- Log SELECT deliberately retains owner/group-only access to OTHER users' logs;
-- selected companions/legacy readers continue to read only their own logs.
-- Row-dependent visibility helpers are not wrapped in an uncorrelated SELECT.

create policy "roots_prayer175_items_select" on public.prayer_items
for select to "authenticated"
using (public.can_view_prayer_item(visibility, user_id)
  or exists (
    select 1 from public.prayer_item_recipients r
    where r.prayer_item_id = prayer_items.id
      and r.recipient_id = (select auth.uid())
  )
  or public.can_view_legacy_prayer_intercession(id));

create policy "roots_prayer175_items_insert" on public.prayer_items
for insert to "authenticated"
with check (user_id = (select auth.uid()) and public.can_share_prayer_visibility(visibility));

create policy "roots_prayer175_items_update" on public.prayer_items
for update to "authenticated"
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and public.can_share_prayer_visibility(visibility));

create policy "roots_prayer175_items_delete" on public.prayer_items
for delete to "authenticated"
using (user_id = (select auth.uid()));

create policy "roots_prayer175_likes_select" on public.prayer_likes
for select to "authenticated"
using (user_id = (select auth.uid())
  or exists (
    select 1 from public.prayer_items pi
    where pi.id = prayer_likes.prayer_id and pi.is_answered = true
  ));

create policy "roots_prayer175_likes_insert" on public.prayer_likes
for insert to "authenticated"
with check (user_id = (select auth.uid()) and exists (
    select 1 from public.prayer_items pi
    where pi.id = prayer_likes.prayer_id and pi.is_answered = true
  ));

create policy "roots_prayer175_likes_delete" on public.prayer_likes
for delete to "authenticated"
using (user_id = (select auth.uid()));

create policy "roots_prayer175_logs_select" on public.user_prayer_logs
for select to "authenticated"
using (user_id = (select auth.uid())
  or exists (
    select 1 from public.prayer_items pi
    where pi.id = user_prayer_logs.prayer_id
      and public.can_view_prayer_item(pi.visibility, pi.user_id)
  ));

create policy "roots_prayer175_logs_insert" on public.user_prayer_logs
for insert to "authenticated"
with check (user_id = (select auth.uid()) and exists (
    select 1 from public.prayer_items pi
    where pi.id = user_prayer_logs.prayer_id
  ));

create policy "roots_prayer175_logs_delete" on public.user_prayer_logs
for delete to "authenticated"
using (user_id = (select auth.uid()));

do $prayer175_post$
declare actual jsonb;
begin
  select (select coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]'::jsonb) from pg_policies p where p.schemaname = 'public' and p.tablename in ('prayer_items','prayer_likes','user_prayer_logs')) into actual;
  if not (actual = $prayer175_final$[{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_delete","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":null},{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_insert","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND can_share_prayer_visibility(visibility))"},{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_select","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"(can_view_prayer_item(visibility, user_id) OR (EXISTS ( SELECT 1\n   FROM prayer_item_recipients r\n  WHERE ((r.prayer_item_id = prayer_items.id) AND (r.recipient_id = ( SELECT auth.uid() AS uid))))) OR can_view_legacy_prayer_intercession(id))","with_check":null},{"schemaname":"public","tablename":"prayer_items","policyname":"roots_prayer175_items_update","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"UPDATE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND can_share_prayer_visibility(visibility))"},{"schemaname":"public","tablename":"prayer_likes","policyname":"roots_prayer175_likes_delete","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":null},{"schemaname":"public","tablename":"prayer_likes","policyname":"roots_prayer175_likes_insert","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = prayer_likes.prayer_id) AND (pi.is_answered = true)))))"},{"schemaname":"public","tablename":"prayer_likes","policyname":"roots_prayer175_likes_select","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = prayer_likes.prayer_id) AND (pi.is_answered = true)))))","with_check":null},{"schemaname":"public","tablename":"user_prayer_logs","policyname":"roots_prayer175_logs_delete","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"DELETE","qual":"(user_id = ( SELECT auth.uid() AS uid))","with_check":null},{"schemaname":"public","tablename":"user_prayer_logs","policyname":"roots_prayer175_logs_insert","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"INSERT","qual":null,"with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE (pi.id = user_prayer_logs.prayer_id))))"},{"schemaname":"public","tablename":"user_prayer_logs","policyname":"roots_prayer175_logs_select","permissive":"PERMISSIVE","roles":["authenticated"],"cmd":"SELECT","qual":"((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1\n   FROM prayer_items pi\n  WHERE ((pi.id = user_prayer_logs.prayer_id) AND can_view_prayer_item(pi.visibility, pi.user_id)))))","with_check":null}]$prayer175_final$::jsonb) then
    raise exception '175 postcheck failed: unexpected target policy set';
  end if;
  if current_setting('roots.prayer175_functions') is distinct from (select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid) || coalesce(p.proacl::text,''), '' order by p.oid),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','roots_prayer_173_private') and p.prokind in ('f','p'))
    or current_setting('roots.prayer175_other_policies') is distinct from (select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by p.schemaname,p.tablename,p.policyname),'')) from pg_policies p where not (p.schemaname = 'public' and p.tablename in ('prayer_items','prayer_likes','user_prayer_logs')))
    or current_setting('roots.prayer175_triggers') is distinct from (select md5(coalesce(string_agg(t.oid::text || pg_get_triggerdef(t.oid),'' order by t.oid),'')) from pg_trigger t where not t.tgisinternal)
    or current_setting('roots.prayer175_grants') is distinct from (select md5(coalesce(string_agg(c.oid::text || coalesce(c.relacl::text,'') || c.relrowsecurity::text || c.relforcerowsecurity::text,'' order by c.oid),'')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','roots_prayer_173_private') and c.relkind in ('r','p')) then
    raise exception '175 postcheck failed: a function, trigger, grant or unrelated policy changed';
  end if;
end;
$prayer175_post$;

commit;

-- All eight values should be true. These are configuration checks; app checks follow.
select
  (select count(*) = 4 from pg_policies where schemaname='public' and tablename='prayer_items') as prayer_rules_ready,
  (select count(*) = 3 from pg_policies where schemaname='public' and tablename='prayer_likes') as gratitude_rules_ready,
  (select count(*) = 3 from pg_policies where schemaname='public' and tablename='user_prayer_logs') as intercession_rules_ready,
  not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename in ('prayer_items','prayer_likes','user_prayer_logs') and roles <> array['authenticated']::name[]) as authenticated_only,
  not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename in ('prayer_items','prayer_likes','user_prayer_logs') and cmd in ('SELECT','ALL') and qual='true') as broad_read_removed,
  exists (select 1 from pg_policies where schemaname='public' and tablename='prayer_items' and policyname='roots_prayer175_items_select' and qual like '%can_view_legacy_prayer_intercession%') as legacy_access_preserved,
  exists (select 1 from pg_policies where schemaname='public' and tablename='prayer_items' and policyname='roots_prayer175_items_select' and qual like '%prayer_item_recipients%') as partner_access_preserved,
  not has_schema_privilege('authenticated','roots_prayer_173_private','USAGE')
    and not has_schema_privilege('anon','roots_prayer_173_private','USAGE') as archive_stays_private;
