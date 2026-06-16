import { useState, useEffect, useRef, Fragment } from 'react'
import confetti from 'canvas-confetti'
import { useAuth } from '../context/AuthContext'
import { useMatches } from '../context/MatchContext'
import { supabase } from '../lib/supabase'
import CreateLeagueModal from '../components/CreateLeagueModal'
import LeagueSettingsModal from '../components/LeagueSettingsModal'
import UserPredictionsModal from '../components/UserPredictionsModal'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

function CelebrationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H3.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h2.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function CelebrationOverlay({ names, onDismiss }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!reducedMotion) {
      confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.3 }, colors: ['#d4a017', '#c4492f', '#f4efe5', '#fff'] })
      confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.3 }, colors: ['#d4a017', '#c4492f', '#f4efe5', '#fff'] })
    }
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="celebration-overlay" onClick={onDismiss} role="dialog" aria-modal="true" aria-label="Feiring">
      <div className={`celebration-name${reducedMotion ? ' celebration-name--no-motion' : ''}`}>
        {names}
      </div>
    </div>
  )
}

function cacheRowToLeaderboardRow(r) {
  return {
    userId: r.user_id,
    name: r.name,
    score: r.score,
    correct: r.correct,
    played: r.played,
  }
}

export default function Ligaer() {
  const { user } = useAuth()
  const { matches } = useMatches()
  const [leagues, setLeagues] = useState(null)
  const [selectedId, setSelectedId] = useState('overall')
  const [leagueData, setLeagueData] = useState({})
  const [loadingLeague, setLoadingLeague] = useState(false)
  const [overallData, setOverallData] = useState(null)
  const [loadingOverall, setLoadingOverall] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [celebrating, setCelebrating] = useState(false)
  const [celebrationNames, setCelebrationNames] = useState('')
  const intervalRef = useRef(null)

  async function fetchLeagues() {
    if (!user) return
    const { data, error } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name, invite_token, created_by, house_rules)')
      .eq('user_id', user.id)

    if (error) { setFetchError('Kunne ikke laste ligaer.'); return }

    const list = (data ?? []).map(row => row.leagues).filter(Boolean)
    setLeagues(list)
  }

  async function fetchOverallData() {
    setLoadingOverall(true)
    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select('user_id, name, score, correct, played')
      .order('score', { ascending: false })
      .order('correct', { ascending: false })

    if (error) { setLoadingOverall(false); return }

    const rows = (data ?? []).map(cacheRowToLeaderboardRow)
    setOverallData({
      rows,
      playedCount: rows[0]?.played ?? 0,
    })
    setLoadingOverall(false)
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

    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select('user_id, name, score, correct, played')
      .in('user_id', memberIds)
      .order('score', { ascending: false })
      .order('correct', { ascending: false })

    if (error) { setLoadingLeague(false); return }

    const rows = (data ?? []).map(cacheRowToLeaderboardRow)
    setLeagueData(prev => ({
      ...prev,
      [leagueId]: {
        rows,
        profiles: rows.map(r => ({ user_id: r.userId, full_name: r.name })),
      }
    }))
    setLoadingLeague(false)
  }

  useEffect(() => {
    fetchLeagues()
    fetchOverallData()

    intervalRef.current = setInterval(() => {
      setSelectedId(id => {
        if (id === 'overall') fetchOverallData()
        else if (id) fetchLeagueData(id)
        return id
      })
    }, 60_000)

    return () => clearInterval(intervalRef.current)
  }, [user])

  useEffect(() => {
    if (selectedId && selectedId !== 'overall' && !leagueData[selectedId]) {
      fetchLeagueData(selectedId)
    }
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

  async function openUser(row) {
    setSelectedUser({ row, byMatch: null, bySpecial: null, loading: true })

    const [predsRes, specialsRes] = await Promise.all([
      supabase.from('predictions').select('match_id, outcome, boosted').eq('user_id', row.userId),
      supabase.from('special_predictions').select('market_id, outcome_id').eq('user_id', row.userId),
    ])

    const byMatch = {}
    for (const p of predsRes.data ?? []) {
      byMatch[p.match_id] = { outcome: p.outcome, boosted: !!p.boosted }
    }
    const bySpecial = {}
    for (const p of specialsRes.data ?? []) {
      bySpecial[p.market_id] = p.outcome_id
    }

    setSelectedUser({ row, byMatch, bySpecial, loading: false })
  }

  function rowKeyDown(e, row) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openUser(row)
    }
  }

  function celebrate(rows) {
    if (celebrating || rows.length === 0) return
    const topScore = rows[0].score
    const leaders = rows.filter(r => r.score === topScore)
    const names = leaders.map(r => r.name).join(' & ')
    setCelebrationNames(names)
    setCelebrating(true)
  }

  const header = (
    <div className="section-head">
      <div>
        <h2>Ligaer</h2>
      </div>
      <button className="btn-create-league" onClick={() => setShowCreate(true)} title="Opprett en liga">
        +
      </button>
    </div>
  )

  if (fetchError) return <div>{header}<p className="lb-empty-note">{fetchError}</p></div>
  if (leagues === null) return <div>{header}<div className="lb-loading">Laster ligaer…</div></div>

  const selectedLeague = selectedId !== 'overall' ? leagues.find(l => l.id === selectedId) : null
  const isAdmin = selectedLeague?.created_by === user?.id
  const current = selectedId !== 'overall' ? leagueData[selectedId] : null
  const playedCount = current?.rows[0]?.played ?? 0

  return (
    <div>
      {header}

      <div className="pill-nav">
        <div className="pill-group">
          <div className="pill-section-label">OVERALL</div>
          <div className="league-pills">
            <button
              className={`league-pill${selectedId === 'overall' ? ' active' : ''}`}
              onClick={() => setSelectedId('overall')}
            >
              Overall
            </button>
          </div>
        </div>

        <div className="pill-group">
          <div className="pill-section-label">DINE LIGAER</div>
          {leagues.length === 0 ? (
            <div className="liga-empty-inline">
              <span className="liga-empty-inline-text">Du er ikke med i noen liga ennå.</span>
              <button className="btn-accent" onClick={() => setShowCreate(true)}>
                Opprett liga
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {selectedId === 'overall' ? (
        <>
          {loadingOverall && !overallData ? (
            <div className="lb-loading">Laster…</div>
          ) : overallData ? (
            <>
              <div className="league-head">
                <div className="league-head-titles">
                  <span className="league-head-name">Alle spillere</span>
                  <span className="league-head-sub">
                    {`Totalt ${overallData.rows.length} spillere`}
                  </span>
                </div>
              </div>
              {overallData.rows.length === 0 ? (
                <p className="lb-empty-note">Ingen spillere ennå.</p>
              ) : (
                <div className="lb-list">
                  {overallData.rows.map((row, i) => {
                    const isMe = row.userId === user?.id
                    const rank = i + 1
                    let tierClass = ''
                    if (rank === 1) tierClass = ' lb-row--rank-1'
                    else if (rank === 2) tierClass = ' lb-row--rank-2'
                    else if (rank === 3) tierClass = ' lb-row--rank-3'
                    return (
                      <Fragment key={row.userId}>
                        {rank === 4 && <div className="lb-zone-divider" />}
                        {rank === 11 && <div className="lb-zone-divider" />}
                        <div
                          className={`lb-row${isMe ? ' me' : ''}${tierClass}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => openUser(row)}
                          onKeyDown={e => rowKeyDown(e, row)}
                        >
                          <span className="rk">{rank}</span>
                          <div className="who">
                            <div className="nm">
                              {row.name}
                              {isMe && <span className="you-tag">Deg</span>}
                            </div>
                            <div className="st">{row.correct} av {overallData.playedCount} rette</div>
                          </div>
                          <span className="trend fl">–</span>
                          <span className="score">{row.score}</span>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              )}
              {overallData.playedCount === 0 && (
                <p className="lb-empty-note">Tabellen oppdateres når kampene er spilt.</p>
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          {selectedLeague && (
            <div className="league-head">
              <span className="league-head-name">{selectedLeague.name}</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {current && current.rows.length > 0 && (
                  <button
                    className="btn-gear"
                    onClick={() => celebrate(current.rows)}
                    disabled={celebrating}
                    title="Feir lederen!"
                  >
                    <CelebrationIcon />
                  </button>
                )}
                {isAdmin && (
                  <button className="btn-gear" onClick={() => setShowSettings(true)} title="Ligainnstillinger">
                    <GearIcon />
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedLeague?.house_rules?.trim() && (
            <div className="house-rules-card">
              <span className="house-rules-label">Husregler</span>
              <p className="house-rules-text">{selectedLeague.house_rules}</p>
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
                      <div
                        key={row.userId}
                        className={`lb-row${isMe ? ' me' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openUser(row)}
                        onKeyDown={e => rowKeyDown(e, row)}
                      >
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
        </>
      )}

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

      {selectedUser && (
        <UserPredictionsModal
          user={selectedUser.row}
          byMatch={selectedUser.byMatch ?? {}}
          bySpecial={selectedUser.bySpecial ?? {}}
          matches={matches}
          onClose={() => setSelectedUser(null)}
          loading={selectedUser.loading}
        />
      )}

      {celebrating && (
        <CelebrationOverlay
          names={celebrationNames}
          onDismiss={() => setCelebrating(false)}
        />
      )}
    </div>
  )
}
