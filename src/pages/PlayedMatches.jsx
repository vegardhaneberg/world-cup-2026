import { useMatches } from '../context/MatchContext'
import { usePredictions } from '../context/PredictionContext'
import { isMatchHidden } from '../data/matchUtils'
import TeamCrest from '../components/TeamCrest'
import PickBadges from '../components/PickBadges'
import { boostedPoints } from '../data/scoring'

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

function PlayedCard({ match, prediction, boosted }) {
  const hasResult = match.result !== null

  if (!hasResult) {
    return (
      <div className="match match--done">
        <div className="match-top">
          <span className="grp">{match.group ? `Gruppe ${match.group}` : (match.stage ?? '').replace(/_/g, ' ')}</span>
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
          {prediction && <PickBadges prediction={prediction} state="pending" />}
          <span className="result-badge pending">Venter på resultat…</span>
        </div>
      </div>
    )
  }

  const correct = prediction && prediction === match.result
  const basePoints = correct
    ? prediction === 'home'
      ? match.pointsHome
      : prediction === 'draw'
        ? match.pointsDraw
        : match.pointsAway
    : 0
  const pointsEarned = boosted ? boostedPoints(basePoints) : basePoints

  return (
    <div className={`match match--done${boosted ? ' match--boosted' : ''}`}>
      <div className="match-top">
        <span className="grp">{match.group ? `Gruppe ${match.group}` : (match.stage ?? '').replace(/_/g, ' ')}</span>
        {boosted && <span className="boost-badge">⚡2x</span>}
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
          {match.homeScore} – {match.awayScore}
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
        {prediction && (
          <PickBadges prediction={prediction} state={correct ? 'correct' : 'wrong'} />
        )}
        {prediction && correct && (
          <span className="result-badge correct">+{pointsEarned} p</span>
        )}
        {prediction && !correct && (
          <span className="result-badge wrong">0 p</span>
        )}
      </div>
    </div>
  )
}

export default function PlayedMatches() {
  const { predictions, boosts } = usePredictions()
  const { matches, loading } = useMatches()

  const played = matches.filter(m => isMatchHidden(m))
  const grouped = groupByLocalDate(played)

  const header = (
    <div className="section-head light">
      <span className="date-flag">{played.length} kamp{played.length !== 1 ? 'er' : ''}</span>
    </div>
  )

  if (loading) {
    return <div>{header}<div className="lb-loading">Laster kamper…</div></div>
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
              prediction={predictions[m.id]}
              boosted={boosts[m.id] !== undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
