-- Insert result for match 1: Mexico vs South Africa (2026-06-11)
-- Adjust home_score, away_score, and result to match the actual outcome.
-- result must be 'home' (Mexico win), 'draw', or 'away' (South Africa win)

insert into public.match_results (match_id, home_score, away_score, result)
values (1, 2, 1, 'home')
on conflict (match_id) do update
  set home_score = excluded.home_score,
      away_score = excluded.away_score,
      result     = excluded.result,
      played_at  = now();
