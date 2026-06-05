-- ============================================================
-- VM-Tippet '26 — Spesialer (outright / special bets)
-- Supabase Dashboard → SQL Editor → New query → Run  (safe to re-run)
--
-- Generic 3-table design for outright markets. The first market is the
-- tournament winner ('winner' / 'Verdensmester'); future markets (top
-- scorer, etc.) drop in as new rows with NO schema change.
--
-- A market holds many priced outcomes; each user picks ONE outcome per
-- market. Reward = ceil(frozen_odds ?? odds), with NO cap — contrast with
-- match points which clamp to 20.
-- ============================================================


-- 1. SPECIAL_MARKETS — one row per outright market
-- ---------------------------------------------------------------
create table if not exists public.special_markets (
  id                uuid primary key default gen_random_uuid(),
  key               text unique not null,          -- e.g. 'winner'
  title             text not null,                 -- e.g. 'Verdensmester'
  status            text not null default 'open',  -- 'open' | 'settled'
  locks_at          timestamptz,                   -- picks lock at first WC kickoff
  result_outcome_id uuid,                           -- winning outcome (set on settle)
  created_at        timestamptz default now() not null
);

alter table public.special_markets enable row level security;

drop policy if exists "Anyone can read special markets" on public.special_markets;
create policy "Anyone can read special markets"
  on public.special_markets for select
  using (true);


-- 2. SPECIAL_OUTCOMES — priced outcomes within a market
-- ---------------------------------------------------------------
create table if not exists public.special_outcomes (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid not null references public.special_markets(id) on delete cascade,
  name        text not null,                 -- e.g. 'Spain'
  odds        numeric(8,2) not null,         -- rounded average back-odds
  frozen_odds numeric(8,2),                  -- snapshot at locks_at (reward basis)
  sort        integer not null default 0,    -- favourites first (by odds)
  unique (market_id, name)
);

alter table public.special_outcomes enable row level security;

drop policy if exists "Anyone can read special outcomes" on public.special_outcomes;
create policy "Anyone can read special outcomes"
  on public.special_outcomes for select
  using (true);


-- 3. FK: special_markets.result_outcome_id → special_outcomes.id
-- Added after both tables exist to break the circular reference.
-- ---------------------------------------------------------------
alter table public.special_markets
  drop constraint if exists special_markets_result_outcome_id_fkey;
alter table public.special_markets
  add constraint special_markets_result_outcome_id_fkey
  foreign key (result_outcome_id) references public.special_outcomes(id) on delete set null;


-- 4. SPECIAL_PREDICTIONS — one pick per user per market
-- ---------------------------------------------------------------
create table if not exists public.special_predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  market_id  uuid references public.special_markets(id) on delete cascade not null,
  outcome_id uuid references public.special_outcomes(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, market_id)
);

alter table public.special_predictions enable row level security;

-- All authenticated users can read all special predictions (required for leaderboard)
drop policy if exists "Authenticated users can read all special predictions" on public.special_predictions;
create policy "Authenticated users can read all special predictions"
  on public.special_predictions for select
  using (auth.uid() is not null);

drop policy if exists "Users can insert their own special predictions" on public.special_predictions;
create policy "Users can insert their own special predictions"
  on public.special_predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own special predictions" on public.special_predictions;
create policy "Users can update their own special predictions"
  on public.special_predictions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own special predictions" on public.special_predictions;
create policy "Users can delete their own special predictions"
  on public.special_predictions for delete
  using (auth.uid() = user_id);


-- 5. Realtime publication
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'special_markets') then
    alter publication supabase_realtime add table public.special_markets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'special_outcomes') then
    alter publication supabase_realtime add table public.special_outcomes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'special_predictions') then
    alter publication supabase_realtime add table public.special_predictions;
  end if;
end $$;
