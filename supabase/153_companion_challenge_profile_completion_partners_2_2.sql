-- Profile display helper for companion challenge badges.
--
-- SAFETY / SCOPE:
-- - READ ONLY: this function performs no INSERT / UPDATE / DELETE.
-- - It does not call or alter streak, progress, reward, badge, heart, popup,
--   reflection-completion, or challenge-claim functions.
-- - Qualification mirrors the existing companion challenge pair rule:
--   same challenge-day completion ledger for both users; for challenges starting
--   on/after 2026-08-15, only dates on/after the accepted relationship local date count.
-- - The existing award companion is included as a historical fallback because an
--   award proves that pair qualified at award time, even if the relationship was
--   later removed. Other deleted relationships cannot be reconstructed from the
--   current schema and are intentionally not guessed.

begin;

create or replace function public.get_my_companion_challenge_completion_partners(
  p_challenge_id uuid
)
returns table (
  partner_id uuid,
  partner_name text
)
language sql
security definer
set search_path = ''
stable
as $$
  with me as (
    select auth.uid() as user_id
  ), awarded as (
    select
      cca.challenge_id,
      cca.user_id,
      cca.companion_user_id
    from public.companion_challenge_awards cca
    join me on me.user_id = cca.user_id
    where cca.challenge_id = p_challenge_id
  ), challenge as (
    select
      cc.id,
      cc.start_date,
      cc.end_date,
      cc.required_days
    from public.companion_challenges cc
    join awarded a on a.challenge_id = cc.id
    where cc.id = p_challenge_id
      and cc.status <> 'cancelled'
  ), accepted_relations as (
    select
      case
        when c.requester_id = me.user_id then c.receiver_id
        else c.requester_id
      end as partner_id,
      min(c.created_at) as relationship_created_at,
      min(
        coalesce(
          c.accepted_local_date,
          coalesce(c.responded_at, c.updated_at, c.created_at)::date
        )
      ) as relationship_start_date
    from public.companions c
    cross join me
    where me.user_id is not null
      and c.status = 'accepted'
      and (c.requester_id = me.user_id or c.receiver_id = me.user_id)
    group by case
      when c.requester_id = me.user_id then c.receiver_id
      else c.requester_id
    end
  ), qualifying_current as (
    select relation.partner_id
    from accepted_relations relation
    cross join me
    cross join challenge ch
    where (
      select count(*)::integer
      from public.companion_challenge_daily_completions mine
      where mine.challenge_id = ch.id
        and mine.user_id = me.user_id
        and mine.completion_date between ch.start_date and ch.end_date
        and (
          ch.start_date < date '2026-08-15'
          or mine.completion_date >= relation.relationship_start_date
        )
        and exists (
          select 1
          from public.companion_challenge_daily_completions partner
          where partner.challenge_id = mine.challenge_id
            and partner.user_id = relation.partner_id
            and partner.completion_date = mine.completion_date
        )
    ) >= ch.required_days
  ), historical_award_partner as (
    select a.companion_user_id as partner_id
    from awarded a
    where a.companion_user_id is not null
  ), qualifying_partners as (
    select qc.partner_id from qualifying_current qc
    union
    select hap.partner_id from historical_award_partner hap
  )
  select
    qp.partner_id,
    coalesce(nullif(trim(p.name), ''), 'Roots') as partner_name
  from qualifying_partners qp
  join public.profiles p on p.id = qp.partner_id
  where qp.partner_id is not null
  order by lower(coalesce(nullif(trim(p.name), ''), 'Roots')), qp.partner_id;
$$;

comment on function public.get_my_companion_challenge_completion_partners(uuid) is
  'Read-only profile helper returning all currently verifiable companion pairs that completed the awarded challenge with the signed-in user, plus the award companion as a historical fallback. Uses the existing same-day ledger and accepted-local-date eligibility rule; never changes streak, progress, rewards, badges, hearts, or challenge state.';

revoke all on function public.get_my_companion_challenge_completion_partners(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_companion_challenge_completion_partners(uuid)
  to authenticated, service_role;

commit;
