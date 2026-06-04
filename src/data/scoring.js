export function getMatchPoints(homeTeam, awayTeam, oddsRow) {
  if (!oddsRow) return { home: 2, draw: 3, away: 4 }

  const home = Number(oddsRow.odds_home)
  const draw = Number(oddsRow.odds_draw)
  const away = Number(oddsRow.odds_away)

  return {
    home: home ? Math.max(1, Math.round(home)) : 2,
    draw: draw ? Math.max(1, Math.round(draw)) : 3,
    away: away ? Math.max(1, Math.round(away)) : 4,
    oddsH: home || null,
    oddsB: away || null,
  }
}
