-- Adds separate profile badge columns for the new Roots badges.
-- Run this in the Supabase SQL Editor before deploying code that reads these columns.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_roots_together boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_prayer_ember boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_word_peace boolean DEFAULT false;
