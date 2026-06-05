import { createClient } from '@supabase/supabase-js';

// Live sync for the Verdensmester (tournament winner) special market.
//
// Before locks_at: refresh each seeded outcome's `odds` from the-odds-api
// outrights market (averaged across bookmakers' back prices, mirroring
// avgH2HOdds / the seed script).
//
// At/after locks_at: on the FIRST run, snapshot the current odds into
// `frozen_odds` for every outcome — this is the reward basis. After that the
// market is frozen and the script makes no further changes.
//
// Run:  ODDS_API_KEY=… SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/sync-winner-odds.js

const { ODDS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!ODDS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: ODDS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const SPORT_KEY = 'soccer_fifa_world_cup_winner';

// Average the back-market ('outrights') prices for a team across bookmakers.
// Excludes 'outrights_lay' (lay prices), mirroring avgH2HOdds in sync-odds.js.
function avgOutright(bookmakers, name) {
  const prices = [];
  for (const bm of bookmakers) {
    const market = (bm.markets ?? []).find(m => m.key === 'outrights');
    if (!market) continue;
    const o = market.outcomes.find(o => o.name === name);
    if (o) prices.push(o.price);
  }
  return prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : null;
}

async function fetchOutrights() {
  const url = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?markets=outrights&regions=eu,uk,us&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;
  console.log('Fetching winner outrights from the-odds-api.com…');
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`ERROR: the-odds-api.com returned ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Fetched ${data.length} outright event(s).`);
  return data;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Load the winner market and its outcomes.
  const { data: market, error: marketErr } = await supabase
    .from('special_markets')
    .select('id, locks_at')
    .eq('key', 'winner')
    .single();
  if (marketErr || !market) {
    console.error('ERROR: winner market not found. Run seed-winner-odds.js first.');
    process.exit(1);
  }

  const { data: outcomes, error: outErr } = await supabase
    .from('special_outcomes')
    .select('id, name, odds, frozen_odds')
    .eq('market_id', market.id);
  if (outErr) {
    console.error('ERROR reading outcomes:', outErr.message);
    process.exit(1);
  }

  const locked = market.locks_at ? Date.now() >= new Date(market.locks_at).getTime() : false;
  const alreadyFrozen = outcomes.some(o => o.frozen_odds != null);

  // Past lock and already snapshotted → the market is frozen; nothing to do.
  if (locked && alreadyFrozen) {
    console.log('Market is locked and frozen_odds already captured. Nothing to do.');
    return;
  }

  // Pull fresh odds and build a name → averaged-price map.
  const events = await fetchOutrights();
  const oddsMap = new Map();
  for (const event of events) {
    for (const o of new Set((event.bookmakers ?? []).flatMap(bm =>
      (bm.markets ?? []).filter(m => m.key === 'outrights').flatMap(m => m.outcomes.map(x => x.name))
    ))) {
      const avg = avgOutright(event.bookmakers, o);
      if (avg != null) oddsMap.set(o, Math.round(avg * 100) / 100);
    }
  }

  if (oddsMap.size === 0) {
    console.error('ERROR: No outright prices returned — leaving existing odds untouched.');
    process.exit(1);
  }

  // At the lock boundary (first run at/after locks_at) we snapshot frozen_odds.
  const freezing = locked && !alreadyFrozen;
  if (freezing) console.log('Lock reached — snapshotting frozen_odds on this run.');

  let updated = 0;
  let skipped = 0;
  const unmatched = [];

  for (const o of outcomes) {
    const fresh = oddsMap.get(o.name);
    if (fresh == null) {
      skipped++;
      continue;
    }

    const update = { odds: fresh };
    if (freezing) update.frozen_odds = fresh;

    const { error } = await supabase
      .from('special_outcomes')
      .update(update)
      .eq('id', o.id);

    if (error) {
      console.error(`ERROR updating ${o.name}: ${error.message}`);
      skipped++;
    } else {
      updated++;
    }
  }

  // Teams the API priced but we don't have seeded (informational only).
  for (const name of oddsMap.keys()) {
    if (!outcomes.some(o => o.name === name)) unmatched.push(name);
  }
  if (unmatched.length) {
    console.warn(`WARN: ${unmatched.length} API team(s) not in winner market: ${unmatched.join(', ')}`);
  }

  console.log(`Done: ${updated} updated, ${skipped} skipped${freezing ? ' (frozen_odds captured)' : ''}.`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
