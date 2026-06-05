-- ============================================================
-- Remove tournament-winner ('Verdensmester') outcomes for teams that did NOT
-- qualify for World Cup 2026.
--
-- Supabase Dashboard → SQL Editor → New query → Run  (safe to re-run)
--
-- These 6 teams are priced by the bookmakers' outright market but are not in
-- the tournament, so they must not be offered as winner picks. The seed/sync
-- scripts also skip them (see scripts/excludedWinnerTeams.js); this statement
-- removes any rows already in the DB.
--
-- NOTE: special_predictions.outcome_id has ON DELETE CASCADE, so any user pick
-- of one of these teams is removed too (those picks are void anyway).
-- ============================================================

delete from public.special_outcomes o
using public.special_markets m
where o.market_id = m.id
  and m.key = 'winner'
  and o.name in (
    'Bolivia',
    'Denmark',
    'Italy',
    'Jamaica',
    'Kosovo',
    'Poland'
  );
