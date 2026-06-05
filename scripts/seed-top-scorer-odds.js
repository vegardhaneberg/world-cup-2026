import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Seed the "Toppscorer" (tournament top scorer) special market from the
// committed src/data/topScorerOdds.json snapshot — the single source of truth
// for the player list and their odds (there is no live odds API for this
// market). Idempotent upsert: never deletes outcomes (special_predictions has
// ON DELETE CASCADE, so removing a player would silently erase user picks).
//
// Run:  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-top-scorer-odds.js

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Tournament kickoff — same lock timestamp as the group market.
const LOCKS_AT = '2026-06-11T19:00:00Z';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOP_SCORER_ODDS_PATH = join(__dirname, '..', 'src', 'data', 'topScorerOdds.json');

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const raw = JSON.parse(readFileSync(TOP_SCORER_ODDS_PATH, 'utf8'));
  const bets = raw.available_bets ?? [];
  if (bets.length === 0) {
    console.error('ERROR: topScorerOdds.json has no available_bets.');
    process.exit(1);
  }

  // Sort favourites first (odds ascending) so `sort` matches the displayed order.
  const sorted = [...bets].sort((a, b) => a.odds - b.odds);

  // Upsert the 'top_scorer' market and get its id.
  const { data: marketRow, error: marketErr } = await supabase
    .from('special_markets')
    .upsert(
      { key: 'top_scorer', title: 'Toppscorer', status: 'open', locks_at: LOCKS_AT },
      { onConflict: 'key' }
    )
    .select('id')
    .single();

  if (marketErr) {
    console.error('ERROR upserting top_scorer market:', marketErr.message);
    process.exit(1);
  }
  console.log(`Top scorer market ${marketRow.id} — locks_at=${LOCKS_AT}`);

  // Upsert outcomes. odds = frozen_odds = JSON odds: there is no live sync to
  // snapshot frozen_odds later, so setting both keeps points correct after lock.
  const rows = sorted.map((b, i) => ({
    market_id: marketRow.id,
    name: b.player,
    odds: b.odds,
    frozen_odds: b.odds,
    sort: i,
  }));

  const { error: outErr } = await supabase
    .from('special_outcomes')
    .upsert(rows, { onConflict: 'market_id,name' });

  if (outErr) {
    console.error('ERROR upserting outcomes:', outErr.message);
    process.exit(1);
  }

  console.log(`Done: ${rows.length} outcomes upserted (never deleted).`);
  for (const r of rows.slice(0, 8)) {
    console.log(`  ${r.sort}. ${r.name} @ ${r.odds} → ${Math.ceil(r.odds)}p`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
