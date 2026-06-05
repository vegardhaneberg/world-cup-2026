-- Migrate special_markets: replace result_outcome_id (single FK) with
-- result_outcome_ids uuid[] to support ties across all outright markets.
--
-- Safe to run: result_outcome_id is null for all rows (WC hasn't started).
-- Run in Supabase Dashboard → SQL Editor → New query → Run

alter table public.special_markets
  drop constraint if exists special_markets_result_outcome_id_fkey;
alter table public.special_markets
  drop column if exists result_outcome_id;

alter table public.special_markets
  add column if not exists result_outcome_ids uuid[] not null default '{}';
