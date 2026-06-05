import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// One-off seed of the Verdensmester (tournament winner) special market from the
// committed src/data/winnerOdds.json snapshot. The live sync script
// (scripts/sync-winner-odds.js) + frozen_odds snapshot are a follow-up; until
// then the reward falls back to these seeded odds.
//
// Run:  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-winner-odds.js

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const WINNER_ODDS_PATH = join(__dirname, '..', 'src', 'data', 'winnerOdds.json');

// Fallback if the matches table is empty: the known WC 2026 opener.
const DEFAULT_LOCKS_AT = '2026-06-11T00:00:00Z';

// Average the back-market ('outrights') prices for a team across bookmakers.
// Excludes 'outrights_lay' (lay prices), mirroring avgH2HOdds in sync-odds.js.
function avgOutright(bookmakers, name) {
  const prices = [];
  for (const bm of bookmakers) {
    const market = bm.markets.find(m => m.key === 'outrights');
    if (!market) continue;
    const o = market.outcomes.find(o => o.name === name);
    if (o) prices.push(o.price);
  }
  return prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : null;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const raw = JSON.parse(readFileSync(WINNER_ODDS_PATH, 'utf8'));
  const market = Array.isArray(raw) ? raw[0] : raw;
  if (!market?.bookmakers) {
    console.error('ERROR: winnerOdds.json has no bookmakers.');
    process.exit(1);
  }

  // Collect every team that appears in any back-market.
  const names = new Set();
  for (const bm of market.bookmakers) {
    const m = bm.markets.find(mk => mk.key === 'outrights');
    if (m) for (const o of m.outcomes) names.add(o.name);
  }

  // Average + round each team's odds, then sort favourites first.
  const outcomes = [];
  for (const name of names) {
    const avg = avgOutright(market.bookmakers, name);
    if (avg == null) continue;
    outcomes.push({ name, odds: Math.round(avg * 100) / 100 });
  }
  outcomes.sort((a, b) => a.odds - b.odds);

  if (outcomes.length === 0) {
    console.error('ERROR: No outright outcomes found in winnerOdds.json.');
    process.exit(1);
  }

  // locks_at = kickoff of the first WC match (fallback to the known opener).
  const { data: firstMatch, error: matchErr } = await supabase
    .from('matches')
    .select('utc_date')
    .order('utc_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (matchErr) {
    console.error('ERROR reading matches:', matchErr.message);
    process.exit(1);
  }
  const locksAt = firstMatch?.utc_date ?? DEFAULT_LOCKS_AT;

  // Upsert the 'winner' market and get its id.
  const { data: marketRow, error: marketUpsertErr } = await supabase
    .from('special_markets')
    .upsert(
      { key: 'winner', title: 'Verdensmester', status: 'open', locks_at: locksAt },
      { onConflict: 'key' }
    )
    .select('id')
    .single();

  if (marketUpsertErr) {
    console.error('ERROR upserting winner market:', marketUpsertErr.message);
    process.exit(1);
  }
  console.log(`Winner market ${marketRow.id} — locks_at=${locksAt}`);

  // Upsert outcomes (sort = favourites first).
  const rows = outcomes.map((o, i) => ({
    market_id: marketRow.id,
    name: o.name,
    odds: o.odds,
    sort: i,
  }));

  const { error: outErr } = await supabase
    .from('special_outcomes')
    .upsert(rows, { onConflict: 'market_id,name' });

  if (outErr) {
    console.error('ERROR upserting outcomes:', outErr.message);
    process.exit(1);
  }

  console.log(`Done: ${rows.length} outcomes upserted.`);
  for (const r of rows.slice(0, 8)) {
    console.log(`  ${r.sort}. ${r.name} @ ${r.odds} → ${Math.ceil(r.odds)}p`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
