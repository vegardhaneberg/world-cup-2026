import { createClient } from '@supabase/supabase-js';

// Settle the Verdensmester market: map the FINISHED FINAL match winner to the
// matching special_outcomes row and set special_markets.result_outcome_ids
// (+ status='settled'). leaderboard.js then folds the reward into each user's
// score with no further match-data coupling.
//
// The FINAL may be decided on penalties — sync-match-results.js records that as
// a 'draw' (no full-time winner). In that case set WINNER_TEAM explicitly to the
// actual champion (team name as it appears in special_outcomes).
//
// Run:  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… [WINNER_TEAM="Spain"] node scripts/settle-winner.js

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WINNER_TEAM } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Determine the champion.
  let winnerTeam = WINNER_TEAM;
  if (!winnerTeam) {
    const { data: final, error } = await supabase
      .from('matches')
      .select('home_team, away_team, result, status')
      .eq('stage', 'FINAL')
      .eq('status', 'FINISHED')
      .maybeSingle();

    if (error) {
      console.error('ERROR reading FINAL match:', error.message);
      process.exit(1);
    }
    if (!final) {
      console.error('No FINISHED FINAL match found. Set WINNER_TEAM to settle manually.');
      process.exit(1);
    }
    if (final.result === 'home') winnerTeam = final.home_team;
    else if (final.result === 'away') winnerTeam = final.away_team;
    else {
      console.error(
        'FINAL is recorded as a draw (likely decided on penalties). ' +
        'Set WINNER_TEAM env to the actual champion and re-run.'
      );
      process.exit(1);
    }
  }
  console.log(`Champion: ${winnerTeam}`);

  // Find the winner market.
  const { data: market, error: marketErr } = await supabase
    .from('special_markets')
    .select('id')
    .eq('key', 'winner')
    .single();
  if (marketErr || !market) {
    console.error('ERROR: winner market not found. Run seed-winner-odds.js first.');
    process.exit(1);
  }

  // Find the matching outcome.
  const { data: outcome, error: outErr } = await supabase
    .from('special_outcomes')
    .select('id, name')
    .eq('market_id', market.id)
    .eq('name', winnerTeam)
    .maybeSingle();
  if (outErr) {
    console.error('ERROR reading outcomes:', outErr.message);
    process.exit(1);
  }
  if (!outcome) {
    console.error(`No outcome named "${winnerTeam}" in the winner market. Check team-name spelling.`);
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

  console.log(`Settled: winner market → ${outcome.name} (${outcome.id}).`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
