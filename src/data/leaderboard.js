export function computeLeaderboard(profiles, allPredictions, playedMatches) {
  const resultMap = Object.fromEntries(playedMatches.map(m => [m.id, m]))
  const playedMatchIds = new Set(playedMatches.map(m => m.id))

  const predByUser = {}
  for (const p of allPredictions) {
    if (!predByUser[p.user_id]) predByUser[p.user_id] = {}
    predByUser[p.user_id][p.match_id] = p.outcome
  }

  return profiles.map(profile => {
    const userPreds = predByUser[profile.user_id] ?? {}
    let score = 0
    let correct = 0

    for (const matchId of playedMatchIds) {
      const m = resultMap[matchId]
      const pred = userPreds[matchId]
      if (pred && pred === m.result) {
        correct++
        if (pred === 'home') score += m.pointsHome
        else if (pred === 'draw') score += m.pointsDraw
        else score += m.pointsAway
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
