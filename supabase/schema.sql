-- ============================================================
-- VM-Tippet '26 — Full schema  (safe to re-run)
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================


-- 1. PREDICTIONS
-- ---------------------------------------------------------------
create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  match_id   integer not null,
  outcome    text check (outcome in ('home', 'draw', 'away')) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, match_id)
);

alter table public.predictions enable row level security;

-- Drop old combined policy if it exists
drop policy if exists "Users manage their own predictions" on public.predictions;

-- All authenticated users can read all predictions (required for leaderboard)
drop policy if exists "Authenticated users can read all predictions" on public.predictions;
create policy "Authenticated users can read all predictions"
  on public.predictions for select
  using (auth.uid() is not null);

drop policy if exists "Users can insert their own predictions" on public.predictions;
create policy "Users can insert their own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own predictions" on public.predictions;
create policy "Users can update their own predictions"
  on public.predictions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own predictions" on public.predictions;
create policy "Users can delete their own predictions"
  on public.predictions for delete
  using (auth.uid() = user_id);


-- 2. PROFILES
-- User display names, readable by everyone in the game.
-- Auto-populated by trigger on auth.users.
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read all profiles" on public.profiles;
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Users can upsert their own profile" on public.profiles;
create policy "Users can upsert their own profile"
  on public.profiles for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger: keep profile in sync whenever a user signs in or updates their account
create or replace function public.sync_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  )
  on conflict (user_id) do update
    set full_name  = excluded.full_name,
        email      = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.sync_profile();


-- 3. MATCHES
-- Single source of truth for schedule and results.
-- Populated by sync-matches.js (schedule) and sync-match-results.js (scores).
-- match_id in predictions references matches.id (football-data.org match ID).
-- ---------------------------------------------------------------
create table if not exists public.matches (
  id            integer primary key,  -- football-data.org match ID
  utc_date      timestamptz not null,
  status        text not null,        -- TIMED, IN_PLAY, FINISHED, POSTPONED, etc.
  stage         text not null,        -- GROUP_STAGE, ROUND_OF_16, etc.
  "group"       text,                 -- GROUP_A … GROUP_L, null for knockouts
  matchday      integer,
  home_team     text not null,
  away_team     text not null,
  venue         text,
  last_updated  timestamptz,
  home_score    integer,              -- null until match is finished
  away_score    integer,
  result        text check (result in ('home', 'draw', 'away')),
  played_at     timestamptz
);

alter table public.matches enable row level security;

drop policy if exists "Anyone can read matches" on public.matches;
create policy "Anyone can read matches"
  on public.matches for select
  using (true);

-- Enable realtime so the frontend updates instantly when results are synced
alter publication supabase_realtime add table public.matches;


-- 4. FK: predictions.match_id → matches.id
-- ---------------------------------------------------------------
-- MIGRATION NOTE: When applying this to an existing database, you must first:
--   1. Clear old predictions: DELETE FROM predictions;
--   2. Populate the matches table: node scripts/sync-matches.js
--   3. Then run this ALTER to add the FK constraint.
-- Existing predictions reference old sequential IDs (1, 2, 3…) and must be cleared.

alter table public.predictions
  drop constraint if exists predictions_match_id_fkey;

alter table public.predictions
  add constraint predictions_match_id_fkey
  foreign key (match_id) references public.matches(id) on delete cascade;


-- 5. DROP legacy match_results table
-- ---------------------------------------------------------------
drop table if exists public.match_results;
