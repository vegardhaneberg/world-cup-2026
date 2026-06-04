-- ============================================================
-- VM-Tippet '26 — Matchday Booster (2x)
-- Supabase Dashboard → SQL Editor → New query → Run
--
-- Additive migration: each user may boost ONE prediction per period
-- (group matchday 1/2/3, or each knockout stage). A correct boosted
-- pick scores double; a wrong one is unaffected (upside-only).
-- ============================================================


-- 1. Booster columns on predictions
-- ---------------------------------------------------------------
alter table public.predictions
  add column if not exists boosted boolean not null default false;

alter table public.predictions
  add column if not exists boost_period text;  -- GROUP_1/2/3 or knockout stage

-- DB-enforced "one boost per period": at most one boosted row per
-- (user, period). Partial index so non-boosted rows are unconstrained.
drop index if exists public.predictions_one_boost_per_period;
create unique index predictions_one_boost_per_period
  on public.predictions (user_id, boost_period)
  where boosted;


-- 2. set_boost RPC — move/set a boost atomically within a period
-- ---------------------------------------------------------------
-- Clears any existing boost in the period, then sets the new one in a
-- single transaction so the partial unique index never sees two rows.
-- Owner-scoped via auth.uid(); the target prediction must already exist.
create or replace function public.set_boost(p_match_id integer, p_period text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_locked_holder integer;
begin
  -- Refuse to move the boost if the period's current boost sits on a match
  -- that has already locked (kickoff within 5 min or started). The 2x is
  -- committed there and cannot be moved to another match this period.
  select p.match_id into v_locked_holder
    from public.predictions p
    join public.matches m on m.id = p.match_id
   where p.user_id = auth.uid()
     and p.boost_period = p_period
     and p.boosted
     and p.match_id <> p_match_id
     and now() >= m.utc_date - interval '5 minutes'
   limit 1;

  if v_locked_holder is not null then
    raise exception 'Cannot move boost: match % in period % is locked', v_locked_holder, p_period;
  end if;

  -- Release the period's current boost (if any)
  update public.predictions
     set boosted = false, boost_period = null, updated_at = now()
   where user_id = auth.uid()
     and boost_period = p_period
     and boosted;

  -- Apply the boost to the target prediction
  update public.predictions
     set boosted = true, boost_period = p_period, updated_at = now()
   where user_id = auth.uid()
     and match_id = p_match_id;

  if not found then
    raise exception 'Cannot boost match %: no prediction exists', p_match_id;
  end if;
end;
$$;

grant execute on function public.set_boost(integer, text) to authenticated;
