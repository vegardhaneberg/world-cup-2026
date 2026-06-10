-- ============================================================
-- VM-Tippet '26 — House Rules (Husregler) for leagues
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Optional free-text note an admin can set per league, shown to all members.
-- Nullable, no default: existing leagues get null and show no card.
alter table public.leagues
  add column if not exists house_rules text;

-- Enforce the 500-char ceiling at the DB level (writes go directly through the
-- Supabase client with no server validation layer).
alter table public.leagues
  drop constraint if exists leagues_house_rules_len;
alter table public.leagues
  add constraint leagues_house_rules_len
  check (house_rules is null or char_length(house_rules) <= 500);

-- Reads ("Anyone can read leagues") and writes ("Creator can update league")
-- are covered by the existing RLS policies — no new policies needed.
