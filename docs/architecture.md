# World Cup 2026 — Application Architecture

## Overview

A Norwegian-language World Cup 2026 prediction web app. Users log in with Google, pick outcomes for group stage matches, and compete on a live leaderboard scored by real betting odds (correct predictions on unlikely outcomes earn more points).

**Stack:** React 18 SPA · Vite · React Router v6 · Supabase (Postgres + Auth + Realtime)

---

## Local Data Files

All static data lives in `src/data/` and is bundled at build time — no runtime fetching.

### `src/data/matches.json`
The authoritative list of all 80+ group stage matches.

| Field | Description |
|---|---|
| `round` | Match number (1–80+) |
| `date` | Match date (YYYY-MM-DD) |
| `time` | Kick-off time with UTC offset (e.g. `"21:00 UTC+2"`) |
| `team1` / `team2` | Team names |
| `group` | Group letter (A–L) |
| `ground` | Stadium name |

### `src/data/wc-odds.json` (308 KB)
Betting odds scraped from multiple bookmakers (Marathon Bet, Pinnacle, Betfair, Everygame, Unibet, Coolbet, 888sport). Used only at build/load time to pre-calculate point values per match outcome — the file is not fetched from a server.

Structure per entry:
```json
{
  "home_team": "...",
  "away_team": "...",
  "bookmakers": [
    {
      "title": "Pinnacle",
      "markets": [{ "key": "h2h", "outcomes": [{ "name": "...", "price": 2.4 }] }]
    }
  ]
}
```

### `src/data/dummyData.js`
Imports `matches.json` and enriches each match with:
- **Team colors & country codes** — 51 teams defined in the `TEAM_INFO` constant
- **Point values** — calls `scoring.js` to map odds to integer points for home/draw/away
- **Even-match flag** — set when both team odds are ≥ 2.4

Exports:
- `matches` — enriched match array used everywhere in the UI
- `getTeamInfo(name)` — look up color/code by team name
- `getActiveMatches()` / `getUpcomingMatchDays()` — filtered views

### `src/data/scoring.js`
`getMatchPoints(homeTeam, awayTeam)` averages the h2h odds across all bookmakers in `wc-odds.json` for a given fixture, then maps each outcome's odds to points via `Math.max(1, Math.round(odds))`. Falls back to home=2, draw=3, away=4 if no odds data is found.

---

## Supabase

**Project:** `mqggtitjetlgvawmfijp.supabase.co`  
**Client:** `src/lib/supabase.js` (initialized with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)  
**Full schema:** `supabase/schema.sql`

### Table: `predictions`

Stores each user's pick for each match.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `user_id` | UUID FK → auth.users | |
| `match_id` | INTEGER | 1-based index matching position in `matches.json` |
| `outcome` | TEXT | `'home'` \| `'draw'` \| `'away'` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

Unique constraint on `(user_id, match_id)`.

**Row Level Security:**
- `SELECT` — any authenticated user can read all rows (required for leaderboard scoring)
- `INSERT / UPDATE / DELETE` — users can only modify their own rows (`user_id = auth.uid()`)

**Reads:**
- `PredictionContext` on mount: fetches the current user's predictions (`SELECT match_id, outcome WHERE user_id = $1`)
- `Leaderboard` on mount and on realtime trigger: fetches all predictions (`SELECT user_id, match_id, outcome`)

**Writes:**
- `PredictionContext.predict()`: `UPSERT` when user picks an outcome; `DELETE` when toggling the same button off

### Table: `profiles`

Display names for the leaderboard.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK FK → auth.users | |
| `full_name` | TEXT | from Google OAuth metadata |
| `email` | TEXT | |
| `updated_at` | TIMESTAMPTZ | |

A Postgres trigger (`sync_profile`) fires on `auth.users` INSERT/UPDATE and auto-populates `profiles` from `raw_user_meta_data`.

**Row Level Security:**
- `SELECT` — any authenticated user can read all rows
- All writes: users can only upsert their own row

**Reads:**
- `Leaderboard` on mount: `SELECT user_id, full_name, email` (no filter)

**Writes:**
- `AuthContext` after successful login: `UPSERT` with name and email from Google session

### Table: `match_results`

Completed match outcomes entered manually by an admin.

| Column | Type | Notes |
|---|---|---|
| `match_id` | INTEGER PK | matches `predictions.match_id` |
| `home_score` / `away_score` | INTEGER | final score |
| `result` | TEXT | `'home'` \| `'draw'` \| `'away'` |
| `played_at` | TIMESTAMPTZ | defaults to `now()` |

**Row Level Security:**
- `SELECT` — public (including anonymous)
- `INSERT / UPDATE / DELETE` — service role only (no user-facing write path)

**Realtime:** Enabled via `supabase_realtime` publication. The `Leaderboard` page subscribes to `postgres_changes` on this table and refetches all data whenever a result is inserted or updated.

**Reads:**
- `Leaderboard` on mount, on realtime event, and every 60 seconds (polling fallback): `SELECT match_id, result`

---

## Authentication

**Provider:** Google OAuth via Supabase Auth (no password login).

**Flow:**
1. User clicks "Logg inn med Google" on `/login`
2. `AuthContext.login()` calls `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: window.location.origin })`
3. After redirect back, `onAuthStateChange` fires and sets the user in context
4. `AuthContext` immediately upserts the `profiles` row with the Google display name and email
5. `PredictionContext` fetches the user's existing predictions

**Session persistence:** `supabase.auth.getSession()` on app load restores the session from browser storage.

**Logout:** `supabase.auth.signOut()` → user state clears → React Router redirects to `/login`.

**Protected routes:** `<ProtectedRoute>` in `App.jsx` checks for a non-null user; unauthenticated visitors are redirected to `/login`.

---

## Pages & Routing

| Route | Component | Description |
|---|---|---|
| `/login` | `Login.jsx` | Google sign-in card. No data fetching. |
| `/` | `App.jsx` → tabs | Protected. Default view with two tabs. |

### Tab 1 — Tipping (`Matches.jsx`)

- **Upcoming matches** grouped by local date (Europe/Oslo timezone). Each match shows group, time, city, teams (color disc + country code), point values, and pick buttons (H / U / B = home/draw/away in Norwegian).
- **Completed matches** in a collapsible section. Shows score, user's pick, and whether it was correct.
- Data: `dummyData.matches` + `PredictionContext` (Supabase-backed user predictions)

### Tab 2 — Tabellen (`Leaderboard.jsx`)

- Ranking table sorted by total score descending (then by correct-prediction count).
- Columns: rank, name ("Deg" tag for current user), correct count ("N av X rette"), total score.
- Scoring: for each completed match where the user's prediction matches `match_results.result`, add `matches[matchId].points[outcome]`.
- Data: all three Supabase tables fetched in parallel on mount, then kept live via realtime + 60 s polling.

---

## Data Flow

```
App Load
  supabase.auth.getSession()
    ├── No session → redirect to /login
    └── Session found
          AuthContext: set user, upsert profiles row
          PredictionContext: SELECT predictions WHERE user_id = me

User Makes a Pick (Matches tab)
  Click H/U/B button
  PredictionContext.predict(matchId, outcome)
    Optimistic UI update
    UPSERT predictions (or DELETE if toggling same pick off)
    Revert local state on Supabase error

Leaderboard Load
  Parallel fetch:
    SELECT * FROM profiles
    SELECT * FROM predictions
    SELECT * FROM match_results
  computeLeaderboard() joins all three datasets
  supabase.channel('lb_match_results')
    .on('postgres_changes' on match_results)
    → re-fetch all three tables on any change
  setInterval(fetchData, 60_000)  ← polling fallback

Admin Enters Match Result
  INSERT / UPDATE match_results via Supabase dashboard or service-role API
  Realtime event propagates to all connected Leaderboard clients instantly
```

---

## Environment Variables

```
VITE_SUPABASE_URL=https://mqggtitjetlgvawmfijp.supabase.co/
VITE_SUPABASE_ANON_KEY=<anon JWT>
```

Both are exposed to the browser (Vite `VITE_` prefix). All sensitive operations are gated by Supabase RLS and service-role-only policies.

---

## External Dependencies (Runtime)

| Dependency | Purpose |
|---|---|
| Supabase | Database, auth, realtime |
| Google OAuth | Identity provider (via Supabase) |
| Google Fonts CDN | Anton + Archivo typefaces loaded in `index.html` |

No other external API calls are made at runtime. The odds data in `wc-odds.json` was collected offline and bundled statically.
