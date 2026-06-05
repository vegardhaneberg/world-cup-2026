import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Seed the "Gruppen med flest kort" market with 12 outcomes (Gruppe A–L).
// Odds are fixed at 5.00. Cards = yellow + red combined, equal weight.
//
// Run: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-most-carded-group.js

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const matchesData = JSON.parse(
  readFileSync(join(__dirname, '../src/data/matches.json'), 'utf-8')
);

function buildGroups(data) {
  const groups = {};
  for (const match of data.matches ?? []) {
    if (!match.group) continue;
    if (!groups[match.group]) groups[match.group] = new Set();
    groups[match.group].add(match.team1);
    groups[match.group].add(match.team2);
  }
  return groups;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const groups = buildGroups(matchesData);
  const sortedKeys = Object.keys(groups).sort(); // "Group A" … "Group L"

  const { data: market, error: marketErr } = await supabase
    .from('special_markets')
    .insert({
      key: 'most_carded_group',
      title: 'Gruppen med flest kort',
      status: 'open',
      locks_at: '2026-06-11T19:00:00Z',
    })
    .select()
    .single();

  if (marketErr) {
    console.error('ERROR creating market:', marketErr.message);
    process.exit(1);
  }
  console.log(`Created market: ${market.id} (${market.title})`);

  const outcomes = sortedKeys.map((group, i) => ({
    market_id: market.id,
    name: group.replace('Group ', 'Gruppe '), // "Gruppe A" … "Gruppe L"
    odds: 5.00,
    frozen_odds: 5.00,
    sort: i + 1,
  }));

  const { data: inserted, error: outErr } = await supabase
    .from('special_outcomes')
    .insert(outcomes)
    .select();

  if (outErr) {
    console.error('ERROR creating outcomes:', outErr.message);
    process.exit(1);
  }

  console.log(`Created ${inserted.length} outcomes:`);
  for (const o of inserted) {
    console.log(`  ${o.sort}. ${o.name} (odds: ${o.odds})`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
