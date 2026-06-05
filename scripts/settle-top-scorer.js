import { createClient } from '@supabase/supabase-js';

// Settle the Toppscorer market: map the tournament top scorer (TOP_SCORER_PLAYER
// env) to the matching special_outcomes row and set
// special_markets.result_outcome_ids (+ status='settled'). leaderboard.js then
// folds the reward into each user's score with no further coupling.
//
// Unlike the winner market (read from the FINISHED FINAL), there is no
// match-derived result for the top scorer, so the champion player must be passed
// in explicitly. The name must match special_outcomes.name exactly (the player
// string from topScorerOdds.json, e.g. "Erling Braut Haaland").
//
// Run:  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… TOP_SCORER_PLAYER="Erling Braut Haaland" node scripts/settle-top-scorer.js

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOP_SCORER_PLAYER } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!TOP_SCORER_PLAYER) {
  console.error('ERROR: Missing TOP_SCORER_PLAYER env (the top scorer\'s name, exactly as in special_outcomes).');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`Top scorer: ${TOP_SCORER_PLAYER}`);

  // Find the top_scorer market.
  const { data: market, error: marketErr } = await supabase
    .from('special_markets')
    .select('id')
    .eq('key', 'top_scorer')
    .single();
  if (marketErr || !market) {
    console.error('ERROR: top_scorer market not found. Run seed-top-scorer-odds.js first.');
    process.exit(1);
  }

  // Find the matching outcome.
  const { data: outcome, error: outErr } = await supabase
    .from('special_outcomes')
    .select('id, name')
    .eq('market_id', market.id)
    .eq('name', TOP_SCORER_PLAYER)
    .maybeSingle();
  if (outErr) {
    console.error('ERROR reading outcomes:', outErr.message);
    process.exit(1);
  }
  if (!outcome) {
    console.error(`No outcome named "${TOP_SCORER_PLAYER}" in the top_scorer market. Check player-name spelling.`);
    process.exit(1);
  }

  const { error: updateErr } = await supabase
    .from('special_markets')
    .update({ result_outcome_ids: [outcome.id], status: 'settled' })
    .eq('id', market.id);
  if (updateErr) {
    console.error('ERROR settling market:', updateErr.message);
    process.exit(1);
  }

  console.log(`Settled: top_scorer market → ${outcome.name} (${outcome.id}).`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
