export const MAX_POINTS = 20
export const MAX_BOOSTED_POINTS = 30

// Group-stage bonus: every Nth correct group-stage pick earns a flat reward.
// Purely additive and cumulative, no cap — an incentive to spread bets across
// many matches (including cheap favorites) rather than only high-odds upsets.
export const GROUP_BONUS_STEP = 10 // every Nth correct group pick
export const GROUP_BONUS_POINTS = 5 // awards this many points
export const groupBonus = (groupCorrect) =>
  Math.floor(groupCorrect / GROUP_BONUS_STEP) * GROUP_BONUS_POINTS

// Single source of truth for "is this a group-stage match". Knockout rows carry
// a stage instead of a matchday, so a non-null matchday distinguishes the group
// stage. Both the leaderboard and the Tipping-page tracker agree via this.
export const isGroupStageMatch = (match) => match?.matchday != null

// A correct boosted pick is doubled, then clipped to the per-match boosted cap.
export function boostedPoints(base) {
  return Math.min(MAX_BOOSTED_POINTS, base * 2)
}

export function getMatchPoints(homeTeam, awayTeam, oddsRow) {
  if (!oddsRow) return { home: 2, draw: 3, away: 4 }

  const home = Number(oddsRow.odds_home)
  const draw = Number(oddsRow.odds_draw)
  const away = Number(oddsRow.odds_away)

  return {
    home: home ? Math.min(MAX_POINTS, Math.max(1, Math.round(home))) : 2,
    draw: draw ? Math.min(MAX_POINTS, Math.max(1, Math.round(draw))) : 3,
    away: away ? Math.min(MAX_POINTS, Math.max(1, Math.round(away))) : 4,
    oddsH: home || null,
    oddsB: away || null,
  }
}
