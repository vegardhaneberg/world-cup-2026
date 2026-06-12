import { createClient } from '@supabase/supabase-js'
import { computeLeaderboard } from '../src/data/leaderboard.js'
import { getMatchPoints } from '../src/data/scoring.js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// PostgREST caps unfiltered queries at max_rows (default 1000).
// Paginate with explicit .range() to fetch every row regardless of server cap.
async function fetchAll(table, select, filterFn) {
  const PAGE = 1000
  let from = 0
  const all = []
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1)
    if (filterFn) q = filterFn(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function main() {
  console.log('Fetching data…')

  const [
    profiles,
    predictions,
    matchRows,
    oddsRows,
    specialPredictions,
    settledMarkets,
    specialOutcomes,
  ] = await Promise.all([
    fetchAll('profiles', 'user_id, full_name, email'),
    fetchAll('predictions', 'user_id, match_id, outcome, boosted'),
    fetchAll('matches', 'id, result, matchday, stage', q => q.not('result', 'is', null)),
    fetchAll('odds', 'match_id, odds_home, odds_draw, odds_away'),
    fetchAll('special_predictions', 'user_id, market_id, outcome_id'),
    fetchAll('special_markets', 'id, result_outcome_ids', q => q.not('result_outcome_ids', 'eq', '{}')),
    fetchAll('special_outcomes', 'id, market_id, odds, frozen_odds'),
  ])

  const oddsMap = new Map(oddsRows.map(o => [o.match_id, o]))

  const playedMatches = matchRows.map(m => {
    const pts = getMatchPoints(null, null, oddsMap.get(m.id))
    return {
      id: m.id,
      result: m.result,
      matchday: m.matchday ?? null,
      stage: m.stage ?? null,
      pointsHome: pts.home,
      pointsDraw: pts.draw,
      pointsAway: pts.away,
    }
  })

  console.log(
    `Computing scores: ${profiles.length} players, ${playedMatches.length} played matches, ` +
    `${specialPredictions.length} special picks, ${settledMarkets.length} settled markets…`
  )

  const rows = computeLeaderboard(
    profiles, predictions, playedMatches,
    specialPredictions, settledMarkets, specialOutcomes,
  )

  const now = new Date().toISOString()
  const upsertRows = rows.map(r => ({
    user_id: r.userId,
    name: r.name,
    score: r.score,
    correct: r.correct,
    played: r.played,
    updated_at: now,
  }))

  const { error } = await supabase
    .from('leaderboard_cache')
    .upsert(upsertRows, { onConflict: 'user_id' })
  if (error) throw new Error(`upsert: ${error.message}`)

  console.log(`Done. Upserted ${rows.length} rows to leaderboard_cache.`)
}

main().catch(err => {
  console.error('ERROR:', err)
  process.exit(1)
})
