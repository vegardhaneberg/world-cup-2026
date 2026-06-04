import { createClient } from '@supabase/supabase-js';

const { FOOTBALL_DATA_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!FOOTBALL_DATA_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: FOOTBALL_DATA_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

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

async function fetchAllMatches() {
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION_CODE}/matches`;
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
  return data.matches ?? [];
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`Fetching all matches for competition "${COMPETITION_CODE}"…`);
  const apiMatches = await fetchAllMatches();
  console.log(`Found ${apiMatches.length} match(es).`);

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

    if (!homeTeam || !awayTeam) {
      console.warn(`SKIP: missing team names for match ID ${apiMatch.id}`);
      skipped++;
      continue;
    }

    const row = {
      id: apiMatch.id,
      utc_date: apiMatch.utcDate,
      status: apiMatch.status,
      stage: apiMatch.stage,
      group: apiMatch.group ?? null,
      matchday: apiMatch.matchday ?? null,
      home_team: homeTeam,
      away_team: awayTeam,
      venue: null, // not available in free API tier
      last_updated: apiMatch.lastUpdated ?? null,
    };

    const { error } = await supabase
      .from('matches')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error(`ERROR upserting match ${apiMatch.id} (${homeTeam} vs ${awayTeam}): ${error.message}`);
      skipped++;
    } else {
      console.log(`OK id=${apiMatch.id} ${homeTeam} vs ${awayTeam} [${apiMatch.status}]`);
      upserted++;
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${skipped} skipped.`);

  if (skipped > 0 && upserted === 0 && apiMatches.length > 0) {
    console.error('ERROR: All matches were skipped. This may indicate a competition code mismatch or API change.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
