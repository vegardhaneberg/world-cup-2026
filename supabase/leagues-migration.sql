-- ============================================================
-- VM-Tippet '26 — Leagues feature
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================


-- 1. LEAGUES
-- ---------------------------------------------------------------
create table if not exists public.leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_token text unique not null default gen_random_uuid()::text,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now()
);

alter table public.leagues enable row level security;

drop policy if exists "Authenticated users can read leagues" on public.leagues;
drop policy if exists "Anyone can read leagues" on public.leagues;
create policy "Anyone can read leagues"
  on public.leagues for select
  using (true);

drop policy if exists "Authenticated users can create leagues" on public.leagues;
create policy "Authenticated users can create leagues"
  on public.leagues for insert
  with check (auth.uid() = created_by);

drop policy if exists "Creator can update league" on public.leagues;
create policy "Creator can update league"
  on public.leagues for update
  using (auth.uid() = created_by);

drop policy if exists "Creator can delete league" on public.leagues;
create policy "Creator can delete league"
  on public.leagues for delete
  using (auth.uid() = created_by);


-- 2. LEAGUE MEMBERS
-- ---------------------------------------------------------------
create table if not exists public.league_members (
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (league_id, user_id)
);

alter table public.league_members enable row level security;

drop policy if exists "Authenticated users can read league members" on public.league_members;
create policy "Authenticated users can read league members"
  on public.league_members for select
  using (auth.uid() is not null);

drop policy if exists "Users can join leagues" on public.league_members;
create policy "Users can join leagues"
  on public.league_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "Creator or self can remove member" on public.league_members;
create policy "Creator or self can remove member"
  on public.league_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.leagues l
      where l.id = league_id and l.created_by = auth.uid()
    )
  );


-- ============================================================
-- NOTE: Add the following URL to Supabase Auth allowed redirects:
--   https://<your-domain>/join/*
-- Dashboard → Authentication → URL Configuration → Redirect URLs
-- ============================================================
