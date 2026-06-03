import oddsData from './wc-odds.json'

function avgH2HOdds(bookmakers, outcomeName) {
  const prices = []
  for (const bm of bookmakers) {
    const h2h = bm.markets.find(m => m.key === 'h2h')
    if (!h2h) continue
    const o = h2h.outcomes.find(o => o.name === outcomeName)
    if (o) prices.push(o.price)
  }
  return prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : null
}

export function getMatchPoints(homeTeam, awayTeam) {
  const entry = oddsData.find(e => e.home_team === homeTeam && e.away_team === awayTeam)
  if (!entry) return { home: 2, draw: 3, away: 4 }

  const home = avgH2HOdds(entry.bookmakers, homeTeam)
  const draw = avgH2HOdds(entry.bookmakers, 'Draw')
  const away = avgH2HOdds(entry.bookmakers, awayTeam)

  return {
    home: home ? Math.max(1, Math.round(home)) : 2,
    draw: draw ? Math.max(1, Math.round(draw)) : 3,
    away: away ? Math.max(1, Math.round(away)) : 4,
    oddsH: home ?? null,
    oddsB: away ?? null,
  }
}
