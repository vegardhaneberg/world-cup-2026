import { createClient } from '@supabase/supabase-js';

const { ODDS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!ODDS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: ODDS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function avgH2HOdds(bookmakers, outcomeName) {
  const prices = [];
  for (const bm of bookmakers) {
    const h2h = bm.markets.find(m => m.key === 'h2h');
    if (!h2h) continue;
    const o = h2h.outcomes.find(o => o.name === outcomeName);
    if (o) prices.push(o.price);
  }
  return prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : null;
}

async function fetchOdds() {
  const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?markets=h2h&regions=eu,us&apiKey=${ODDS_API_KEY}`;
  console.log('Fetching odds from the-odds-api.com…');
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`ERROR: the-odds-api.com returned ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Fetched ${data.length} odds entries.`);
  return data;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, home_team, away_team, utc_date');

  if (matchesError) {
    console.error('ERROR fetching matches from Supabase:', matchesError.message);
    process.exit(1);
  }

  console.log(`Loaded ${matches.length} matches from Supabase.`);

  // Build lookup: "home_team|away_team|YYYY-MM-DD" → match id
  const matchMap = new Map();
  for (const m of matches) {
    const date = new Date(m.utc_date).toISOString().slice(0, 10);
    matchMap.set(`${m.home_team}|${m.away_team}|${date}`, m.id);
  }

  const oddsEntries = await fetchOdds();

  let upserted = 0;
  let skipped = 0;

  for (const entry of oddsEntries) {
    const date = new Date(entry.commence_time).toISOString().slice(0, 10);
    const key = `${entry.home_team}|${entry.away_team}|${date}`;
    const matchId = matchMap.get(key);

    if (!matchId) {
      console.warn(`WARN: No match found for ${entry.home_team} vs ${entry.away_team} on ${date} — skipping.`);
      skipped++;
      continue;
    }

    const match = matches.find(m => m.id === matchId);
    const minutesToKickoff = (new Date(match.utc_date) - Date.now()) / 60_000;
    if (minutesToKickoff < 30) {
      console.log(`SKIP match_id=${matchId} — kicks off in ${Math.round(minutesToKickoff)} min (${entry.home_team} vs ${entry.away_team})`);
      skipped++;
      continue;
    }

    const homeOdds = avgH2HOdds(entry.bookmakers, entry.home_team);
    const drawOdds = avgH2HOdds(entry.bookmakers, 'Draw');
    const awayOdds = avgH2HOdds(entry.bookmakers, entry.away_team);

    if (!homeOdds || !drawOdds || !awayOdds) {
      console.warn(`WARN: Incomplete odds for ${entry.home_team} vs ${entry.away_team} — skipping.`);
      skipped++;
      continue;
    }

    const row = {
      match_id: matchId,
      home_team: entry.home_team,
      away_team: entry.away_team,
      odds_home: Math.round(homeOdds * 100) / 100,
      odds_draw: Math.round(drawOdds * 100) / 100,
      odds_away: Math.round(awayOdds * 100) / 100,
      fetched_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('odds')
      .upsert(row, { onConflict: 'match_id' });

    if (error) {
      console.error(`ERROR upserting odds for match ${matchId} (${entry.home_team} vs ${entry.away_team}): ${error.message}`);
      skipped++;
    } else {
      console.log(`OK match_id=${matchId} ${entry.home_team} vs ${entry.away_team}: H=${row.odds_home} D=${row.odds_draw} A=${row.odds_away}`);
      upserted++;
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
