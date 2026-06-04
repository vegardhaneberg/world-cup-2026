import { createClient } from '@supabase/supabase-js';

const { FOOTBALL_DATA_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!FOOTBALL_DATA_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: FOOTBALL_DATA_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// football-data.org used "WC" for the 2022 tournament.
// Verify this code for 2026 — it may differ. Check https://www.football-data.org/v4/competitions
const COMPETITION_CODE = 'WC';

const API_TO_LOCAL_NAME = {
  'United States': 'USA',
  'Czechia': 'Czech Republic',
  'Congo DR': 'DR Congo',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Cape Verde Islands': 'Cape Verde',
};

function normalizeName(name) {
  return API_TO_LOCAL_NAME[name] ?? name;
}

function deriveResult(winner, homeScore, awayScore) {
  if (winner === 'HOME_TEAM') return 'home';
  if (winner === 'AWAY_TEAM') return 'away';
  if (winner === 'DRAW') return 'draw';
  // Fallback: derive from scores
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

async function fetchFinishedMatches() {
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION_CODE}/matches?status=FINISHED`;
  console.log(`Requesting: ${url}`);
  const res = await fetch(url, { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_TOKEN } });

  if (res.status === 401) {
    console.error('ERROR: football-data.org returned 401. Check FOOTBALL_DATA_API_TOKEN.');
    process.exit(1);
  }
  if (res.status === 404) {
    console.error(`ERROR: Competition "${COMPETITION_CODE}" not found. Verify the competition code for WC 2026.`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`ERROR: football-data.org returned ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`API response (${res.status}):`, JSON.stringify(data, null, 2));
  return data.matches ?? [];
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`Fetching finished matches for competition "${COMPETITION_CODE}"…`);
  const apiMatches = await fetchFinishedMatches();
  console.log(`Found ${apiMatches.length} finished match(es) from API.`);

  if (apiMatches.length === 0) {
    console.log('Nothing to upsert.');
    return;
  }

  let upserted = 0;
  let skipped = 0;

  for (const apiMatch of apiMatches) {
    const homeScore = apiMatch.score?.fullTime?.home;
    const awayScore = apiMatch.score?.fullTime?.away;
    if (homeScore == null || awayScore == null) {
      console.warn(`SKIP: missing score for match ID ${apiMatch.id}`);
      skipped++;
      continue;
    }

    const result = deriveResult(apiMatch.score?.winner, homeScore, awayScore);
    const playedAt = apiMatch.utcDate ?? new Date().toISOString();

    // Upsert the full match row so this script is self-contained even if
    // sync-matches.js hasn't run yet. Score/result columns are the priority;
    // schedule columns are included to satisfy NOT NULL constraints on insert.
    const homeTeam = normalizeName(apiMatch.homeTeam?.name ?? '');
    const awayTeam = normalizeName(apiMatch.awayTeam?.name ?? '');

    const { error } = await supabase.from('matches').upsert(
      {
        id: apiMatch.id,
        utc_date: apiMatch.utcDate,
        status: 'FINISHED',
        stage: apiMatch.stage,
        group: apiMatch.group ?? null,
        matchday: apiMatch.matchday ?? null,
        home_team: homeTeam,
        away_team: awayTeam,
        venue: null,
        last_updated: apiMatch.lastUpdated ?? null,
        home_score: homeScore,
        away_score: awayScore,
        result,
        played_at: playedAt,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error(`ERROR upserting match ${apiMatch.id} (${homeTeam} vs ${awayTeam}): ${error.message}`);
      skipped++;
    } else {
      console.log(`OK id=${apiMatch.id} ${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${result})`);
      upserted++;
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${skipped} skipped.`);

  // Fail the job if every match was skipped — likely a systemic issue (wrong competition code, API change)
  if (skipped > 0 && upserted === 0 && apiMatches.length > 0) {
    console.error('ERROR: All matches were skipped. This may indicate a competition code mismatch or API name changes.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
