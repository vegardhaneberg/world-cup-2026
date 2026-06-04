import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMatches } from '../context/MatchContext'
import { supabase } from '../lib/supabase'
import CreateLeagueModal from '../components/CreateLeagueModal'
import LeagueSettingsModal from '../components/LeagueSettingsModal'

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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export default function Ligaer() {
  const { user } = useAuth()
  const { matches } = useMatches()
  const [leagues, setLeagues] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [leagueData, setLeagueData] = useState({})
  const [loadingLeague, setLoadingLeague] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef(null)

  async function fetchLeagues() {
    if (!user) return
    const { data, error } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name, invite_token, created_by)')
      .eq('user_id', user.id)

    if (error) { setFetchError('Kunne ikke laste ligaer.'); return }

    const list = (data ?? []).map(row => row.leagues).filter(Boolean)
    setLeagues(list)
    if (list.length > 0) setSelectedId(id => id ?? list[0].id)
  }

  async function fetchLeagueData(leagueId) {
    setLoadingLeague(true)
    const { data: members, error: membersError } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)

    if (membersError) { setLoadingLeague(false); return }

    const memberIds = members.map(m => m.user_id)
    if (memberIds.length === 0) {
      setLeagueData(prev => ({ ...prev, [leagueId]: { rows: [], profiles: [] } }))
      setLoadingLeague(false)
      return
    }

    const [profilesRes, predsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email').in('user_id', memberIds),
      supabase.from('predictions').select('user_id, match_id, outcome').in('user_id', memberIds),
    ])

    if (profilesRes.error || predsRes.error) { setLoadingLeague(false); return }

    const playedMatches = matches.filter(m => m.result !== null)
    setLeagueData(prev => ({
      ...prev,
      [leagueId]: {
        rows: computeLeaderboard(profilesRes.data, predsRes.data, playedMatches),
        profiles: profilesRes.data,
      }
    }))
    setLoadingLeague(false)
  }

  useEffect(() => {
    fetchLeagues()

    intervalRef.current = setInterval(() => {
      setSelectedId(id => { if (id) fetchLeagueData(id); return id })
    }, 60_000)

    return () => clearInterval(intervalRef.current)
  }, [user])

  useEffect(() => {
    if (selectedId && !leagueData[selectedId]) fetchLeagueData(selectedId)
  }, [selectedId])

  function handleLeagueCreated(league) {
    setLeagues(prev => [...(prev ?? []), league])
    setSelectedId(league.id)
    fetchLeagueData(league.id)
  }

  function handleLeagueUpdated(updated) {
    setLeagues(prev => (prev ?? []).map(l => l.id === updated.id ? updated : l))
  }

  function handleMemberRemoved(leagueId, userId) {
    setLeagueData(prev => {
      const d = prev[leagueId]
      if (!d) return prev
      return {
        ...prev,
        [leagueId]: {
          rows: d.rows.filter(r => r.userId !== userId),
          profiles: d.profiles.filter(p => p.user_id !== userId),
        }
      }
    })
  }

  const header = (
    <div className="section-head">
      <div>
        <div className="sub">VM 2026</div>
        <h2>Ligaer</h2>
      </div>
      <button className="btn-create-league" onClick={() => setShowCreate(true)} title="Opprett en liga">
        +
      </button>
    </div>
  )

  if (fetchError) return <div>{header}<p className="lb-empty-note">{fetchError}</p></div>
  if (leagues === null) return <div>{header}<div className="lb-loading">Laster ligaer…</div></div>

  const selectedLeague = leagues.find(l => l.id === selectedId)
  const isAdmin = selectedLeague?.created_by === user?.id
  const current = selectedId ? leagueData[selectedId] : null
  const playedCount = current?.rows[0]?.played ?? 0

  if (leagues.length === 0) {
    return (
      <div>
        {header}
        <div className="liga-empty">
          <p className="liga-empty-text">Du er ikke med i noen liga ennå.</p>
          <button className="btn-accent" onClick={() => setShowCreate(true)}>
            Opprett en liga
          </button>
        </div>
        {showCreate && (
          <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={handleLeagueCreated} />
        )}
      </div>
    )
  }

  return (
    <div>
      {header}

      <div className="league-pills">
        {leagues.map(l => (
          <button
            key={l.id}
            className={`league-pill${selectedId === l.id ? ' active' : ''}`}
            onClick={() => setSelectedId(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>

      {selectedLeague && (
        <div className="league-head">
          <span className="league-head-name">{selectedLeague.name}</span>
          {isAdmin && (
            <button className="btn-gear" onClick={() => setShowSettings(true)} title="Ligainnstillinger">
              <GearIcon />
            </button>
          )}
        </div>
      )}

      {loadingLeague && !current ? (
        <div className="lb-loading">Laster…</div>
      ) : current ? (
        <>
          {current.rows.length === 0 ? (
            <p className="lb-empty-note">Ingen spillere ennå.</p>
          ) : (
            <div className="lb-list">
              {current.rows.map((row, i) => {
                const isMe = row.userId === user?.id
                return (
                  <div key={row.userId} className={`lb-row${isMe ? ' me' : ''}`}>
                    <span className="rk">{i + 1}</span>
                    <div className="who">
                      <div className="nm">
                        {row.name}
                        {isMe && <span className="you-tag">Deg</span>}
                      </div>
                      <div className="st">{row.correct} av {playedCount} rette</div>
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
        </>
      ) : null}

      {showCreate && (
        <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={handleLeagueCreated} />
      )}

      {showSettings && selectedLeague && (
        <LeagueSettingsModal
          league={selectedLeague}
          members={current?.profiles ?? []}
          onClose={() => setShowSettings(false)}
          onLeagueUpdated={handleLeagueUpdated}
          onMemberRemoved={userId => handleMemberRemoved(selectedLeague.id, userId)}
        />
      )}
    </div>
  )
}
