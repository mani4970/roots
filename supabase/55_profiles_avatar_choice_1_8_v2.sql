-- 55_profiles_avatar_choice_1_8_v2.sql
-- Roots 1.8 v2 avatar choice foundation
--
-- Purpose:
-- - Store whether a user chooses Rootsman or Rootswoman for garden/watering display.
-- - Track whether the first avatar-choice prompt has been acknowledged.
--
-- Safety notes:
-- - Does NOT change Bible Reflection completion/progress/streak logic.
-- - Does NOT change qt_records, daily_checkins, watering/progress functions, Love Hearts, or reward map progression.
-- - Existing profiles RLS/policies and table grants continue to control access to these new columns.

begin;

alter table public.profiles
  add column if not exists avatar_type text not null default 'rootsman';

alter table public.profiles
  add column if not exists avatar_choice_seen boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_type_check
      check (avatar_type in ('rootsman', 'rootswoman'));
  end if;
end $$;

comment on column public.profiles.avatar_type is
  'Selected Roots garden avatar: rootsman or rootswoman. This is visual only and does not affect progress/streak.';

comment on column public.profiles.avatar_choice_seen is
  'Whether the user has seen or dismissed the Roots avatar choice prompt.';

commit;
