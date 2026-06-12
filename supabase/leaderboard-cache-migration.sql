-- Pre-computed leaderboard scores, refreshed by the compute-leaderboard GH Action.
-- Replaces client-side computeLeaderboard() calls which were hitting the
-- PostgREST max_rows limit (hard server cap, not overridable by the client).

create table leaderboard_cache (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text        not null,
  score      integer     not null default 0,
  correct    integer     not null default 0,
  played     integer     not null default 0,
  updated_at timestamptz not null default now()
);

alter table leaderboard_cache enable row level security;

create policy "Authenticated users can read leaderboard cache"
  on leaderboard_cache for select
  using (auth.role() = 'authenticated');
