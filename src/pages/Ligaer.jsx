import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMatches } from '../context/MatchContext'
import { supabase } from '../lib/supabase'
import CreateLeagueModal from '../components/CreateLeagueModal'
import LeagueSettingsModal from '../components/LeagueSettingsModal'
import UserPredictionsModal from '../components/UserPredictionsModal'
import { computeLeaderboard } from '../data/leaderboard'

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
  const [selectedId, setSelectedId] = useState('overall')
  const [leagueData, setLeagueData] = useState({})
  const [loadingLeague, setLoadingLeague] = useState(false)
  const [overallData, setOverallData] = useState(null)
  const [loadingOverall, setLoadingOverall] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
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

  // Special picks + settled markets feed the leaderboard alongside match
  // predictions. Markets/outcomes are global; pass memberIds to scope picks
  // to a league, or null for the overall table.
  async function fetchSpecialsData(memberIds) {
    let predQuery = supabase
      .from('special_predictions')
      .select('user_id, market_id, outcome_id')
    if (memberIds) predQuery = predQuery.in('user_id', memberIds)

    const [predsRes, marketsRes, outcomesRes] = await Promise.all([
      predQuery,
      supabase.from('special_markets').select('id, result_outcome_ids').not('result_outcome_ids', 'eq', '{}'),
      supabase.from('special_outcomes').select('id, market_id, odds, frozen_odds'),
    ])

    return {
      specialPredictions: predsRes.data ?? [],
      settledMarkets: marketsRes.data ?? [],
      specialOutcomes: outcomesRes.data ?? [],
    }
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
      setLeagueData(prev => ({ ...prev, [leagueId]: { rows: [], profiles: [], predictions: [], specialPredictions: [] } }))
      setLoadingLeague(false)
      return
    }

    const [profilesRes, predsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email').in('user_id', memberIds),
      supabase.from('predictions').select('user_id, match_id, outcome, boosted').in('user_id', memberIds),
    ])

    if (profilesRes.error || predsRes.error) { setLoadingLeague(false); return }

    const specials = await fetchSpecialsData(memberIds)
    const playedMatches = matches.filter(m => m.result !== null)
    setLeagueData(prev => ({
      ...prev,
      [leagueId]: {
        rows: computeLeaderboard(
          profilesRes.data, predsRes.data, playedMatches,
          specials.specialPredictions, specials.settledMarkets, specials.specialOutcomes,
        ),
        profiles: profilesRes.data,
        predictions: predsRes.data,
        specialPredictions: specials.specialPredictions,
      }
    }))
    setLoadingLeague(false)
  }

  async function fetchOverallData() {
    setLoadingOverall(true)
    const [profilesRes, predsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('predictions').select('user_id, match_id, outcome, boosted'),
    ])

    if (profilesRes.error || predsRes.error) { setLoadingOverall(false); return }

    const specials = await fetchSpecialsData(null)
    const usersWithPicks = new Set([
      ...predsRes.data.map(p => p.user_id),
      ...specials.specialPredictions.map(p => p.user_id),
    ])
    const filteredProfiles = profilesRes.data.filter(p => usersWithPicks.has(p.user_id))

    const playedMatches = matches.filter(m => m.result !== null)
    setOverallData({
      rows: computeLeaderboard(
        filteredProfiles, predsRes.data, playedMatches,
        specials.specialPredictions, specials.settledMarkets, specials.specialOutcomes,
      ),
      playedCount: playedMatches.length,
      totalPlayers: profilesRes.data.length,
      predictions: predsRes.data,
      specialPredictions: specials.specialPredictions,
    })
    setLoadingOverall(false)
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
          ...d,
          rows: d.rows.filter(r => r.userId !== userId),
          profiles: d.profiles.filter(p => p.user_id !== userId),
        }
      }
    })
  }

  function openUser(row, allPredictions, allSpecialPredictions) {
    const byMatch = {}
    for (const p of allPredictions ?? []) {
      if (p.user_id === row.userId) {
        byMatch[p.match_id] = { outcome: p.outcome, boosted: !!p.boosted }
      }
    }
    const bySpecial = {}
    for (const p of allSpecialPredictions ?? []) {
      if (p.user_id === row.userId) {
        bySpecial[p.market_id] = p.outcome_id
      }
    }
    setSelectedUser({ row, byMatch, bySpecial })
  }

  function rowKeyDown(e, row, allPredictions, allSpecialPredictions) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openUser(row, allPredictions, allSpecialPredictions)
    }
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
                  <span className="league-head-name">Topp 20</span>
                  <span className="league-head-sub">
                    {overallData.totalPlayers === 1
                      ? 'av totalt 1 registrert spiller'
                      : `av totalt ${overallData.totalPlayers} registrerte spillere`}
                  </span>
                </div>
              </div>
              {overallData.rows.length === 0 ? (
                <p className="lb-empty-note">Ingen spillere ennå.</p>
              ) : (
                <div className="lb-list">
                  {overallData.rows.slice(0, 20).map((row, i) => {
                    const isMe = row.userId === user?.id
                    return (
                      <div
                        key={row.userId}
                        className={`lb-row${isMe ? ' me' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openUser(row, overallData.predictions, overallData.specialPredictions)}
                        onKeyDown={e => rowKeyDown(e, row, overallData.predictions, overallData.specialPredictions)}
                      >
                        <span className="rk">{i + 1}</span>
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
                    )
                  })}
                  {(() => {
                    const myIndex = overallData.rows.findIndex(r => r.userId === user?.id)
                    if (myIndex < 20) return null
                    const myRow = overallData.rows[myIndex]
                    return (
                      <>
                        <div className="lb-ellipsis">…</div>
                        <div
                          className="lb-row me"
                          role="button"
                          tabIndex={0}
                          onClick={() => openUser(myRow, overallData.predictions, overallData.specialPredictions)}
                          onKeyDown={e => rowKeyDown(e, myRow, overallData.predictions, overallData.specialPredictions)}
                        >
                          <span className="rk">{myIndex + 1}</span>
                          <div className="who">
                            <div className="nm">
                              {myRow.name}
                              <span className="you-tag">Deg</span>
                            </div>
                            <div className="st">{myRow.correct} av {overallData.playedCount} rette</div>
                          </div>
                          <span className="trend fl">–</span>
                          <span className="score">{myRow.score}</span>
                        </div>
                      </>
                    )
                  })()}
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
              {isAdmin && (
                <button className="btn-gear" onClick={() => setShowSettings(true)} title="Ligainnstillinger">
                  <GearIcon />
                </button>
              )}
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
                        onClick={() => openUser(row, current.predictions, current.specialPredictions)}
                        onKeyDown={e => rowKeyDown(e, row, current.predictions, current.specialPredictions)}
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
          byMatch={selectedUser.byMatch}
          bySpecial={selectedUser.bySpecial}
          matches={matches}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  )
}
