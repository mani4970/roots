-- Christian Roots 2.1 visibility-helper anonymous access cleanup
--
-- These SECURITY DEFINER helpers are used only by authenticated RLS policies
-- and authenticated Storage access. The app does not call them directly.
-- Remove unnecessary anonymous RPC exposure while preserving authenticated and
-- service-role behavior.
--
-- Intentionally not included:
--   public.get_group_invite(uuid)
-- It must remain callable by anon so a logged-out visitor can preview a public
-- group invitation.

begin;

do $$
begin
  if to_regprocedure('public.can_share_prayer_visibility(text)') is null
    or to_regprocedure('public.can_view_prayer_item(text,uuid)') is null
    or to_regprocedure('public.can_view_qt_record(text,uuid)') is null
  then
    raise exception 'Safety stop: one or more expected visibility helpers are missing';
  end if;
end
$$;

-- Use an empty runtime search path for SECURITY DEFINER helpers. All
-- application-schema references inside the functions are already qualified.
alter function public.can_share_prayer_visibility(text)
  set search_path = '';
alter function public.can_view_prayer_item(text, uuid)
  set search_path = '';
alter function public.can_view_qt_record(text, uuid)
  set search_path = '';

-- Remove the broad default and the existing direct anonymous grants.
revoke all on function public.can_share_prayer_visibility(text) from public;
revoke all on function public.can_view_prayer_item(text, uuid) from public;
revoke all on function public.can_view_qt_record(text, uuid) from public;

revoke execute on function public.can_share_prayer_visibility(text) from anon;
revoke execute on function public.can_view_prayer_item(text, uuid) from anon;
revoke execute on function public.can_view_qt_record(text, uuid) from anon;

grant execute on function public.can_share_prayer_visibility(text)
  to authenticated, service_role;
grant execute on function public.can_view_prayer_item(text, uuid)
  to authenticated, service_role;
grant execute on function public.can_view_qt_record(text, uuid)
  to authenticated, service_role;

do $$
declare
  v_signature regprocedure;
begin
  foreach v_signature in array array[
    'public.can_share_prayer_visibility(text)'::regprocedure,
    'public.can_view_prayer_item(text,uuid)'::regprocedure,
    'public.can_view_qt_record(text,uuid)'::regprocedure
  ]
  loop
    if has_function_privilege('anon', v_signature, 'EXECUTE') then
      raise exception 'Postcheck failed: anon can still execute %', v_signature;
    end if;

    if not has_function_privilege('authenticated', v_signature, 'EXECUTE') then
      raise exception 'Postcheck failed: authenticated cannot execute %', v_signature;
    end if;

    if not has_function_privilege('service_role', v_signature, 'EXECUTE') then
      raise exception 'Postcheck failed: service_role cannot execute %', v_signature;
    end if;
  end loop;
end
$$;

commit;
