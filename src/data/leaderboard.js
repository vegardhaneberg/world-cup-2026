import { boostedPoints, groupBonus, isGroupStageMatch } from './scoring.js'
import { specialPoints } from './specials.js'

// Builds the ranked table. Match predictions drive the "X av Y rette" stats;
// settled special markets (e.g. Verdensmester) only fold into the total score.
//
//   specialPredictions: [{ user_id, market_id, outcome_id }]
//   settledMarkets:     [{ id, result_outcome_ids }]  (only markets with a result)
//   specialOutcomes:    [{ id, odds, frozen_odds }]  (for reward lookup)
export function computeLeaderboard(
  profiles,
  allPredictions,
  playedMatches,
  specialPredictions = [],
  settledMarkets = [],
  specialOutcomes = [],
) {
  const resultMap = Object.fromEntries(playedMatches.map(m => [m.id, m]))
  const playedMatchIds = new Set(playedMatches.map(m => m.id))

  const predByUser = {}
  for (const p of allPredictions) {
    if (!predByUser[p.user_id]) predByUser[p.user_id] = {}
    predByUser[p.user_id][p.match_id] = { outcome: p.outcome, boosted: !!p.boosted }
  }

  // Specials: one pick per (user, market); reward when it matches the result.
  const outcomeById = Object.fromEntries(specialOutcomes.map(o => [o.id, o]))
  const settled = settledMarkets.filter(m => m.result_outcome_ids?.length > 0)
  const specialByUser = {}
  for (const sp of specialPredictions) {
    if (!specialByUser[sp.user_id]) specialByUser[sp.user_id] = {}
    specialByUser[sp.user_id][sp.market_id] = sp.outcome_id
  }

  return profiles.map(profile => {
    const userPreds = predByUser[profile.user_id] ?? {}
    let score = 0
    let correct = 0
    let groupCorrect = 0 // group-stage-only count driving the bonus; not displayed

    for (const matchId of playedMatchIds) {
      const m = resultMap[matchId]
      const pred = userPreds[matchId]
      if (pred && pred.outcome === m.result) {
        correct++ // a boosted correct pick is still one correct pick
        if (isGroupStageMatch(m)) groupCorrect++ // knockouts/specials don't count toward the bonus
        let pts = pred.outcome === 'home' ? m.pointsHome
          : pred.outcome === 'draw' ? m.pointsDraw
          : m.pointsAway
        if (pred.boosted) pts = boostedPoints(pts) // upside-only: double a correct boosted pick (capped)
        score += pts
      }
    }

    // +5 per 10 correct group picks. Folds into score like boosted/specials;
    // correct/played stay pure all-matches counts (bonus is points-only).
    score += groupBonus(groupCorrect)

    // Settled specials add ceil(frozen_odds ?? odds) — no cap. Stats unchanged.
    const userSpecials = specialByUser[profile.user_id] ?? {}
    for (const m of settled) {
      if (m.result_outcome_ids?.includes(userSpecials[m.id])) {
        score += specialPoints(outcomeById[userSpecials[m.id]])
      }
    }

    return {
      userId: profile.user_id,
      name: profile.full_name ?? profile.email ?? 'Ukjent',
      score,
      correct,
      played: playedMatchIds.size,
    }
  }).sort((a, b) => b.score - a.score || b.correct - a.correct)
}
