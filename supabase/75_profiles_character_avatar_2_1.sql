-- 75_profiles_character_avatar_2_1.sql
-- Allows a user to use the currently equipped Roots character as the app-wide profile image.
--
-- Safety scope:
-- - Preserves the uploaded profile photo in an own-user-only table.
-- - Other users continue to see only profiles.avatar_url, the effective image.
-- - Does not expose heart_shop_purchases or saved photo preferences to other users.
-- - Does not change reflection completion, streaks, check-ins, reward maps, or badges.
-- - The new table and RPC have explicit GRANTs, RLS, and policies.

begin;

create table if not exists public.profile_avatar_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mode text not null default 'photo' check (mode in ('photo', 'character')),
  photo_url text,
  character_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profile_avatar_preferences is
  'Own-user-only profile avatar preference. Preserves the uploaded photo while profiles.avatar_url may show a generated Roots character.';
comment on column public.profile_avatar_preferences.photo_url is
  'Preserved uploaded profile photo URL. This is not exposed through public profile queries.';
comment on column public.profile_avatar_preferences.character_signature is
  'Signature of avatar type, equipped item IDs, and the client character asset version.';

-- Before this feature, every non-null profiles.avatar_url was the user's uploaded photo.
insert into public.profile_avatar_preferences (
  user_id,
  mode,
  photo_url,
  character_signature,
  created_at,
  updated_at
)
select
  profile.id,
  'photo',
  profile.avatar_url,
  null,
  now(),
  now()
from public.profiles profile
on conflict (user_id) do nothing;

alter table public.profile_avatar_preferences enable row level security;

drop policy if exists "roots_profile_avatar_preferences_select_own" on public.profile_avatar_preferences;
create policy "roots_profile_avatar_preferences_select_own"
on public.profile_avatar_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "roots_profile_avatar_preferences_insert_own" on public.profile_avatar_preferences;
create policy "roots_profile_avatar_preferences_insert_own"
on public.profile_avatar_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "roots_profile_avatar_preferences_update_own" on public.profile_avatar_preferences;
create policy "roots_profile_avatar_preferences_update_own"
on public.profile_avatar_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "roots_profile_avatar_preferences_delete_own" on public.profile_avatar_preferences;
create policy "roots_profile_avatar_preferences_delete_own"
on public.profile_avatar_preferences
for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.set_profile_avatar_display(
  p_mode text,
  p_effective_avatar_url text default null,
  p_photo_url text default null,
  p_character_signature text default null,
  p_avatar_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_mode not in ('photo', 'character') then
    return jsonb_build_object('updated', false, 'reason', 'invalid_mode');
  end if;

  if p_avatar_type is not null and p_avatar_type not in ('rootsman', 'rootswoman') then
    return jsonb_build_object('updated', false, 'reason', 'invalid_avatar_type');
  end if;

  insert into public.profile_avatar_preferences (
    user_id,
    mode,
    photo_url,
    character_signature,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    p_mode,
    p_photo_url,
    case when p_mode = 'character' then p_character_signature else null end,
    now(),
    now()
  )
  on conflict (user_id) do update
  set mode = excluded.mode,
      photo_url = excluded.photo_url,
      character_signature = excluded.character_signature,
      updated_at = now();

  update public.profiles profile
  set avatar_url = p_effective_avatar_url,
      avatar_type = coalesce(p_avatar_type, profile.avatar_type),
      avatar_choice_seen = case when p_avatar_type is null then profile.avatar_choice_seen else true end
  where profile.id = v_user_id;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'updated', true,
    'reason', 'updated',
    'mode', p_mode,
    'avatar_url', p_effective_avatar_url,
    'photo_url', p_photo_url,
    'character_signature', case when p_mode = 'character' then p_character_signature else null end,
    'avatar_type', p_avatar_type
  );
end;
$$;

comment on function public.set_profile_avatar_display(text, text, text, text, text) is
  'Atomically saves the current user profile avatar preference and effective public avatar URL.';

revoke all privileges on table public.profile_avatar_preferences from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.profile_avatar_preferences to authenticated;
grant select, insert, update, delete on table public.profile_avatar_preferences to service_role;

revoke execute on function public.set_profile_avatar_display(text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_profile_avatar_display(text, text, text, text, text)
  to authenticated, service_role;

commit;

-- Postcheck: expected one row per existing profile immediately after migration.
select
  (select count(*) from public.profiles) as profile_count,
  (select count(*) from public.profile_avatar_preferences) as preference_count;

-- Postcheck: expected zero invalid modes and zero rows visible without their owner policy.
select count(*) as invalid_profile_avatar_modes
from public.profile_avatar_preferences
where mode not in ('photo', 'character')
   or mode is null;
