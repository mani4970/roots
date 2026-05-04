-- Adds persisted profile columns for the 9 Fruits of the Spirit badges.
-- These badges are awarded every 100 cumulative completed daily routines from 100 to 900 days.

alter table if exists public.profiles
  add column if not exists badge_love boolean not null default false,
  add column if not exists badge_peace boolean not null default false,
  add column if not exists badge_joy boolean not null default false,
  add column if not exists badge_goodness boolean not null default false,
  add column if not exists badge_kindness boolean not null default false,
  add column if not exists badge_patience boolean not null default false,
  add column if not exists badge_faithfulness boolean not null default false,
  add column if not exists badge_gentleness boolean not null default false,
  add column if not exists badge_self_control boolean not null default false;
