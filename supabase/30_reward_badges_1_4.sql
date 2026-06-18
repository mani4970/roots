-- Roots 1.4 reward badge pack
-- Adds profile flags for five new low-risk badges that are awarded from existing app data.
-- This migration only adds nullable-safe boolean columns with default false.
-- It does not change progress/streak, Bible Reflection completion, RLS policies, or grants.

alter table public.profiles
  add column if not exists badge_jesus_love boolean not null default false,
  add column if not exists badge_jesus_and_me boolean not null default false,
  add column if not exists badge_receive_my_love boolean not null default false,
  add column if not exists badge_prayer_cheer boolean not null default false,
  add column if not exists badge_word_fruit boolean not null default false;

comment on column public.profiles.badge_jesus_love is 'Awarded after 50 Bible Reflection reactions by the user.';
comment on column public.profiles.badge_jesus_and_me is 'Awarded after 30 answered prayer testimonies by the user.';
comment on column public.profiles.badge_receive_my_love is 'Awarded after 10 accepted faith partners/companions.';
comment on column public.profiles.badge_prayer_cheer is 'Awarded after 60 pray-together/intercessory prayer logs.';
comment on column public.profiles.badge_word_fruit is 'Awarded after receiving Today’s Word 50 times.';
