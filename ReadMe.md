# World Cup 2026 Prediction App

A group prediction game for the FIFA World Cup 2026.

## Stack

- **Frontend**: React + Vite SPA
- **Backend**: Supabase (database + auth)
- **Hosting**: Vercel (frontend), GitHub Actions (match sync), cron-job.org (scheduler)

## Development

```bash
npm install
npm run dev
```

## Deployment

The app auto-deploys to Vercel on every push to `main`.

### First-time Vercel setup

1. Import the GitHub repo at [vercel.com](https://vercel.com)
2. Confirm framework is auto-detected as **Vite** (build: `npm run build`, output: `dist`)
3. Add environment variables under **Project Settings → Environment Variables** (Production only):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Trigger first deploy and note the assigned `*.vercel.app` URL

### After first deploy: Supabase OAuth setup

Google OAuth requires the Vercel URL to be allowlisted in the Supabase dashboard under **Authentication → URL Configuration**:

1. Set **Site URL** to your Vercel URL (e.g. `https://world-cup-2026.vercel.app`)
2. Add the Vercel URL to **Redirect URLs**

Without this step, Google login will fail in production with a redirect mismatch error.

### Match result sync (cron-job.org)

Match results are synced every 5 minutes via a GitHub Actions workflow (`sync-match-results.yml`) triggered by [cron-job.org](https://cron-job.org). GitHub's built-in scheduler is unreliable for high-frequency jobs, so cron-job.org is used as the external trigger.

**Dependency:** A GitHub Personal Access Token with `Actions: Read and write` permission on this repository must exist and be configured in cron-job.org. If the token expires or is revoked, the sync will stop running.

#### Setting up a new cron job

1. Log in at [cron-job.org](https://cron-job.org) and click **Create cronjob**
2. **Title:** something descriptive, e.g. `Sync match results (world-cup-2026)`
3. **URL:** `https://api.github.com/repos/vegardhaneberg/world-cup-2026/actions/workflows/sync-match-results.yml/dispatches`
4. **Schedule:** Every 5 minutes
5. Go to the **Advanced** tab and add these headers:
   - `Authorization` → `Bearer <your-github-pat>`
   - `Accept` → `application/vnd.github+json`
6. Set **Request method** to `POST`
7. Paste `{"ref":"main"}` in the **Request body** field and click **Add Content-Type header** when prompted
8. Click **Create**

#### Creating a GitHub Personal Access Token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**, give it a name and expiration
3. Under **Repository access**, select only the `world-cup-2026` repo
4. Under **Permissions → Repository permissions**, set **Actions** to **Read and write**
5. Generate and copy the token — use it as the `Authorization` header value in cron-job.org (prefixed with `Bearer `)

## External APIs

- Football results: [football-data.org](https://www.football-data.org/documentation/quickstart)
- Odds: [the-odds-api.com](https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/)
