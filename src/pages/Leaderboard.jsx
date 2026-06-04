import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMatches } from '../context/MatchContext'
import { supabase } from '../lib/supabase'

function computeLeaderboard(profiles, allPredictions, playedMatches) {
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

export default function Leaderboard() {
  const { user } = useAuth()
  const { matches } = useMatches()
  const [profiles, setProfiles] = useState(null)
  const [allPredictions, setAllPredictions] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const intervalRef = useRef(null)

  async function fetchData() {
    const [profilesRes, predsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('predictions').select('user_id, match_id, outcome'),
    ])

    if (profilesRes.error || predsRes.error) {
      setFetchError('Kunne ikke laste tabellen.')
      return
    }

    setProfiles(profilesRes.data)
    setAllPredictions(predsRes.data)
  }

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 60_000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const header = (
    <div className="section-head">
      <div>
        <div className="sub">VM 2026</div>
        <h2>Tabellen</h2>
      </div>
    </div>
  )

  if (fetchError) {
    return <div>{header}<p className="lb-empty-note">{fetchError}</p></div>
  }

  if (!profiles || !allPredictions) {
    return <div>{header}<div className="lb-loading">Laster tabellen…</div></div>
  }

  const playedMatches = matches.filter(m => m.result !== null)
  const rows = computeLeaderboard(profiles, allPredictions, playedMatches)
  const playedCount = playedMatches.length

  return (
    <div>
      {header}

      {rows.length === 0 ? (
        <p className="lb-empty-note">Ingen spillere ennå.</p>
      ) : (
        <div className="lb-list">
          {rows.map((row, i) => {
            const isMe = row.userId === user?.id
            return (
              <div key={row.userId} className={`lb-row${isMe ? ' me' : ''}`}>
                <span className="rk">{i + 1}</span>
                <div className="who">
                  <div className="nm">
                    {row.name}
                    {isMe && <span className="you-tag">Deg</span>}
                  </div>
                  <div className="st">
                    {row.correct} av {playedCount} rette
                  </div>
                </div>
                <span className="trend fl">–</span>
                <span className="score">{row.score}</span>
              </div>
            )
          })}
        </div>
      )}

      {playedCount === 0 && (
        <p className="lb-empty-note">Tabellen oppdateres når kampene er spilt.</p>
      )}
    </div>
  )
}
