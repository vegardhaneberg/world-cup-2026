export const MAX_POINTS = 20
export const MAX_BOOSTED_POINTS = 30

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
