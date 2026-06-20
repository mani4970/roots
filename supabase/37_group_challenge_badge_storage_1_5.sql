-- Roots 1.5 group challenge badge storage bucket
-- Purpose:
-- - Store operator-created group challenge badge images outside the app bundle.
-- - Let the app display approved challenge badge images without a new app deployment.
--
-- Safe impact:
-- - Creates/updates a public Supabase Storage bucket named group-challenge-badges.
-- - Allows public read of badge images only.
-- - Does not allow app users to upload badge images.
-- - Does not change progress/streak, Bible Reflection completion, sharing,
--   community feed visibility, reward maps, or existing badge logic.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-challenge-badges',
  'group-challenge-badges',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Badge images are not sensitive. They are shown in group challenge cards,
-- award popups, and profile badges. Keep read access public for simple display.
drop policy if exists "roots_group_challenge_badges_select_public" on storage.objects;
create policy "roots_group_challenge_badges_select_public"
on storage.objects
for select
to public
using (bucket_id = 'group-challenge-badges');

-- No insert/update/delete policy is added for authenticated app users.
-- Operators should upload images through Supabase Dashboard or a future admin tool.
-- The service_role can still manage objects for operations.

commit;
