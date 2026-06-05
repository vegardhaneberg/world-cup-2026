// Special / outright bets (e.g. Verdensmester).
//
// Reward = ceil(frozen_odds ?? odds), with NO cap — contrast with match
// points which clamp to 20. frozen_odds is the snapshot taken at locks_at;
// before that snapshot exists we fall back to the live (seeded) odds.

export function specialOdds(outcome) {
  if (!outcome) return null
  const v = outcome.frozen_odds ?? outcome.odds
  return v == null ? null : Number(v)
}

export function specialPoints(outcome) {
  const odds = specialOdds(outcome)
  return odds == null ? 0 : Math.ceil(odds)
}

// Picks lock at the market's locks_at (kickoff of the first WC match).
// A market with no locks_at is treated as never locked.
export function isSpecialLocked(market) {
  if (!market?.locks_at) return false
  return Date.now() >= new Date(market.locks_at).getTime()
}
