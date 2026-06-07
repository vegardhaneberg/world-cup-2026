import { createClient } from '@supabase/supabase-js';

// Settle the Gullhansken market: map the tournament's best goalkeeper
// (GOLDEN_GLOVE_PLAYER env) to the matching special_outcomes row and set
// special_markets.result_outcome_ids (+ status='settled'). leaderboard.js then
// folds the reward into each user's score with no further coupling.
//
// There is no match-derived result for this award, so the winning player must be
// passed in explicitly. The name must match special_outcomes.name exactly (the
// player string from goldenGloveOdds.json, e.g. "Damian Martinez").
//
// Run:  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… GOLDEN_GLOVE_PLAYER="Damian Martinez" node scripts/settle-golden-glove.js

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOLDEN_GLOVE_PLAYER } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GOLDEN_GLOVE_PLAYER) {
  console.error('ERROR: Missing GOLDEN_GLOVE_PLAYER env (the winner\'s name, exactly as in special_outcomes).');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`Golden glove: ${GOLDEN_GLOVE_PLAYER}`);

  // Find the golden_glove market.
  const { data: market, error: marketErr } = await supabase
    .from('special_markets')
    .select('id')
    .eq('key', 'golden_glove')
    .single();
  if (marketErr || !market) {
    console.error('ERROR: golden_glove market not found. Run seed-golden-glove-odds.js first.');
    process.exit(1);
  }

  // Find the matching outcome.
  const { data: outcome, error: outErr } = await supabase
    .from('special_outcomes')
    .select('id, name')
    .eq('market_id', market.id)
    .eq('name', GOLDEN_GLOVE_PLAYER)
    .maybeSingle();
  if (outErr) {
    console.error('ERROR reading outcomes:', outErr.message);
    process.exit(1);
  }
  if (!outcome) {
    console.error(`No outcome named "${GOLDEN_GLOVE_PLAYER}" in the golden_glove market. Check player-name spelling.`);
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

  console.log(`Settled: golden_glove market → ${outcome.name} (${outcome.id}).`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
