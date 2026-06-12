import postgres from 'postgres'
import { computeLeaderboard } from '../src/data/leaderboard.js'
import { getMatchPoints } from '../src/data/scoring.js'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) {
  console.error('ERROR: Missing DATABASE_URL')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { ssl: 'require' })

async function main() {
  console.log('Fetching data from database…')

  const [
    profiles,
    predictions,
    matchRows,
    oddsRows,
    specialPredictions,
    settledMarkets,
    specialOutcomes,
  ] = await Promise.all([
    sql`SELECT user_id, full_name, email FROM profiles`,
    sql`SELECT user_id, match_id, outcome, boosted FROM predictions`,
    sql`SELECT id, result, matchday, stage FROM matches WHERE result IS NOT NULL`,
    sql`SELECT match_id, odds_home, odds_draw, odds_away FROM odds`,
    sql`SELECT user_id, market_id, outcome_id FROM special_predictions`,
    sql`SELECT id, result_outcome_ids FROM special_markets WHERE result_outcome_ids <> '{}'`,
    sql`SELECT id, market_id, odds, frozen_odds FROM special_outcomes`,
  ])

  const oddsMap = new Map(oddsRows.map(o => [o.match_id, o]))

  // Transform raw match rows into the shape computeLeaderboard expects,
  // mirroring MatchContext.transformMatch (without the UI-only fields).
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
    profiles,
    predictions,
    playedMatches,
    specialPredictions,
    settledMarkets,
    specialOutcomes,
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

  await sql`
    INSERT INTO leaderboard_cache ${sql(upsertRows)}
    ON CONFLICT (user_id) DO UPDATE SET
      name       = EXCLUDED.name,
      score      = EXCLUDED.score,
      correct    = EXCLUDED.correct,
      played     = EXCLUDED.played,
      updated_at = EXCLUDED.updated_at
  `

  console.log(`Done. Upserted ${rows.length} rows to leaderboard_cache.`)
  await sql.end()
}

main().catch(err => {
  console.error('ERROR:', err)
  process.exit(1)
})
