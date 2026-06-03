# World Cup 2026 Prediction App

A group prediction game for the FIFA World Cup 2026.

## Stack

- **Frontend**: React + Vite SPA
- **Backend**: Supabase (database + auth)
- **Hosting**: Vercel (frontend), GitHub Actions (match sync)

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

## External APIs

- Football results: [football-data.org](https://www.football-data.org/documentation/quickstart)
- Odds: [the-odds-api.com](https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/)
