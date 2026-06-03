import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { matches } from '../data/dummyData'

const MATCH_MAP = Object.fromEntries(matches.map(m => [m.id, m]))

function computeLeaderboard(profiles, allPredictions, results) {
  const resultMap = Object.fromEntries(results.map(r => [r.match_id, r]))
  const playedMatchIds = new Set(results.map(r => r.match_id))

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
      const result = resultMap[matchId]
      const pred = userPreds[matchId]
      if (pred && pred === result.result) {
        correct++
        const m = MATCH_MAP[matchId]
        if (m) {
          if (pred === 'home') score += m.pointsHome
          else if (pred === 'draw') score += m.pointsDraw
          else score += m.pointsAway
        }
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
  const [rows, setRows] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const channelRef = useRef(null)
  const intervalRef = useRef(null)

  async function fetchData() {
    const [profilesRes, predsRes, resultsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('predictions').select('user_id, match_id, outcome'),
      supabase.from('match_results').select('match_id, result'),
    ])

    if (profilesRes.error || predsRes.error || resultsRes.error) {
      setFetchError('Kunne ikke laste tabellen.')
      return
    }

    setRows(computeLeaderboard(profilesRes.data, predsRes.data, resultsRes.data))
  }

  useEffect(() => {
    fetchData()

    channelRef.current = supabase
      .channel('lb_match_results')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' }, fetchData)
      .subscribe()

    intervalRef.current = setInterval(fetchData, 60_000)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      clearInterval(intervalRef.current)
    }
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

  if (!rows) {
    return <div>{header}<div className="lb-loading">Laster tabellen…</div></div>
  }

  const playedCount = rows[0]?.played ?? 0

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
