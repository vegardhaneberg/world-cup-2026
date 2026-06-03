import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { matches } from '../data/dummyData'
import { usePredictions } from '../context/PredictionContext'
import { isMatchHidden } from '../data/matchUtils'
import TeamCrest from '../components/TeamCrest'

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('no', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Oslo',
  })
}

function formatDateHeading(localDate) {
  return new Date(localDate + 'T12:00:00Z').toLocaleDateString('no', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function groupByLocalDate(matchList) {
  const map = {}
  for (const m of matchList) {
    if (!map[m.localDate]) map[m.localDate] = []
    map[m.localDate].push(m)
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
}

function PlayedCard({ match, result, prediction }) {
  if (!result) {
    return (
      <div className="match match--done">
        <div className="match-top">
          <span className="grp">Gruppe {match.group}</span>
          <span className="ko">
            <b>{formatTime(match.date)}</b> · {match.city}
          </span>
        </div>
        <div className="fixture">
          <div className="team home">
            <TeamCrest teamName={match.homeTeam} />
            <div>
              <div className="nm">{match.homeTeam}</div>
            </div>
          </div>
          <span className="vs">VS</span>
          <div className="team away">
            <TeamCrest teamName={match.awayTeam} />
            <div>
              <div className="nm">{match.awayTeam}</div>
            </div>
          </div>
        </div>
        <div className="result-row">
          <span className="result-badge pending">Venter på resultat…</span>
        </div>
      </div>
    )
  }

  const correct = prediction && prediction === result.result
  const pointsEarned = correct
    ? prediction === 'home'
      ? match.pointsHome
      : prediction === 'draw'
        ? match.pointsDraw
        : match.pointsAway
    : 0

  return (
    <div className="match match--done">
      <div className="match-top">
        <span className="grp">Gruppe {match.group}</span>
        <span className="ko">
          <b>{formatTime(match.date)}</b> · {match.city}
        </span>
      </div>
      <div className="fixture">
        <div className="team home">
          <TeamCrest teamName={match.homeTeam} />
          <div>
            <div className="nm">{match.homeTeam}</div>
          </div>
        </div>
        <span className="vs result-score">
          {result.home_score} – {result.away_score}
        </span>
        <div className="team away">
          <TeamCrest teamName={match.awayTeam} />
          <div>
            <div className="nm">{match.awayTeam}</div>
          </div>
        </div>
      </div>
      <div className="result-row">
        {!prediction && (
          <span className="result-badge pending">Ikke tippet</span>
        )}
        {prediction && correct && (
          <span className="result-badge correct">+{pointsEarned} p</span>
        )}
        {prediction && !correct && (
          <span className="result-badge wrong">Feil tips</span>
        )}
      </div>
    </div>
  )
}

export default function PlayedMatches() {
  const { predictions } = usePredictions()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const channelRef = useRef(null)

  async function fetchResults() {
    const { data, error } = await supabase
      .from('match_results')
      .select('match_id, home_score, away_score, result')

    if (error) {
      setFetchError('Kunne ikke laste resultater.')
      return
    }
    setResults(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchResults()

    channelRef.current = supabase
      .channel('played_match_results')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' }, fetchResults)
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  const resultMap = Object.fromEntries(results.map(r => [r.match_id, r]))
  const played = matches.filter(m => isMatchHidden(m))
  const grouped = groupByLocalDate(played)

  const header = (
    <div className="section-head">
      <div>
        <h2>Spilte kamper</h2>
      </div>
      <span className="date-flag">{played.length} kamp{played.length !== 1 ? 'er' : ''}</span>
    </div>
  )

  if (fetchError) {
    return <div>{header}<p className="lb-empty-note">{fetchError}</p></div>
  }

  if (loading && played.length > 0) {
    return <div>{header}<div className="lb-loading">Laster resultater…</div></div>
  }

  if (played.length === 0) {
    return (
      <div>
        {header}
        <p className="lb-empty-note">Ingen kamper er spilt ennå.</p>
      </div>
    )
  }

  return (
    <div>
      {header}
      {grouped.map(([date, dayMatches]) => (
        <div key={date}>
          <div className="day-head">{formatDateHeading(date)}</div>
          {dayMatches.map(m => (
            <PlayedCard
              key={m.id}
              match={m}
              result={resultMap[m.id] ?? null}
              prediction={predictions[m.id]}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
