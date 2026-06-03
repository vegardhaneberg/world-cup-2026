import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { FOOTBALL_DATA_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!FOOTBALL_DATA_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: FOOTBALL_DATA_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// football-data.org used "WC" for the 2022 tournament.
// Verify this code for 2026 — it may differ. Check https://www.football-data.org/v4/competitions
const COMPETITION_CODE = 'WC';

// Maps football-data.org team names → names used in matches.json
// Extend this map as new mismatches are discovered during the tournament.
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

// Placeholders like "2A", "W73", "L101", "3A/B/C" appear in knockout-round slots
// before the teams are determined. We can't match these to API responses by name.
function isPlaceholder(name) {
  return /^(\d|[WL]\d)/.test(name);
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

function buildLocalLookup() {
  const raw = readFileSync(join(__dirname, '../src/data/matches.json'), 'utf8');
  const { matches } = JSON.parse(raw);

  // Map "NormTeam1|NormTeam2" → 1-based match_id (index in matches array)
  const lookup = new Map();
  matches.forEach((match, i) => {
    if (isPlaceholder(match.team1) || isPlaceholder(match.team2)) return;
    const key = `${match.team1}|${match.team2}`;
    lookup.set(key, i + 1);
  });
  return lookup;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const localLookup = buildLocalLookup();

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
    const homeTeamRaw = apiMatch.homeTeam?.name ?? '';
    const awayTeamRaw = apiMatch.awayTeam?.name ?? '';
    const homeTeam = normalizeName(homeTeamRaw);
    const awayTeam = normalizeName(awayTeamRaw);

    const matchId = localLookup.get(`${homeTeam}|${awayTeam}`);
    if (!matchId) {
      console.warn(`SKIP: no local match for "${homeTeamRaw}" vs "${awayTeamRaw}" (normalized: "${homeTeam}" vs "${awayTeam}")`);
      skipped++;
      continue;
    }

    const homeScore = apiMatch.score?.fullTime?.home;
    const awayScore = apiMatch.score?.fullTime?.away;
    if (homeScore == null || awayScore == null) {
      console.warn(`SKIP: missing score for match_id ${matchId} ("${homeTeam}" vs "${awayTeam}")`);
      skipped++;
      continue;
    }

    const result = deriveResult(apiMatch.score?.winner, homeScore, awayScore);
    const playedAt = apiMatch.utcDate ?? new Date().toISOString();

    const { error } = await supabase.from('match_results').upsert(
      { match_id: matchId, home_score: homeScore, away_score: awayScore, result, played_at: playedAt },
      { onConflict: 'match_id' }
    );

    if (error) {
      // Log and continue — a single failure shouldn't block other matches
      console.error(`ERROR upserting match_id ${matchId} ("${homeTeam}" vs "${awayTeam}"): ${error.message}`);
      skipped++;
    } else {
      console.log(`OK match_id=${matchId} ${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${result})`);
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
