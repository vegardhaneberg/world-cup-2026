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

// Earliest still-future deadline among markets, as an ms timestamp, or null if
// none. Excludes markets with no locks_at and already-locked markets — neither
// has a deadline left to count down to.
export function earliestUnlockedDeadline(markets) {
  let earliest = null
  for (const m of markets ?? []) {
    if (!m?.locks_at || isSpecialLocked(m)) continue
    const t = new Date(m.locks_at).getTime()
    if (earliest == null || t < earliest) earliest = t
  }
  return earliest
}

// True when `market` is unlocked, has a deadline, and shares the earliest
// unlocked deadline among `markets`. Ties (several markets locking at the same
// instant) are all true — the countdown shows on every one of them.
export function isEarliestUnlockedDeadline(market, markets) {
  if (!market?.locks_at || isSpecialLocked(market)) return false
  const earliest = earliestUnlockedDeadline(markets)
  if (earliest == null) return false
  return new Date(market.locks_at).getTime() === earliest
}
