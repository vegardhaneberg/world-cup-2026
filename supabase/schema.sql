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


-- 3. MATCH RESULTS
-- Filled in by an admin when a match is played.
-- match_id corresponds to the sequential id in the app's matches.json
--   (1 = first group match, 2 = second, etc.)
-- Everyone can read; only service-role / dashboard can insert.
-- ---------------------------------------------------------------
create table if not exists public.match_results (
  match_id   integer primary key,
  home_score integer not null,
  away_score integer not null,
  result     text check (result in ('home', 'draw', 'away')) not null,
  played_at  timestamptz default now() not null
);

alter table public.match_results enable row level security;

drop policy if exists "Anyone can read match results" on public.match_results;
create policy "Anyone can read match results"
  on public.match_results for select
  using (true);

-- Enable realtime so the leaderboard updates instantly when results are entered
alter publication supabase_realtime add table public.match_results;


-- ============================================================
-- To record a result (run from SQL Editor or a future admin UI):
--
--   insert into match_results (match_id, home_score, away_score, result)
--   values (1, 2, 1, 'home');
--
-- match_id 1 = Mexico vs South Africa (first entry in matches.json)
-- result must be 'home', 'draw', or 'away'
-- ============================================================
