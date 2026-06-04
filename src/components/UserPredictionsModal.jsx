import { isMatchLocked } from '../data/matchUtils'
import TeamCrest from './TeamCrest'
import PickBadges from './PickBadges'
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

// Newest day first — mirrors "Spilte kamper".
function groupByLocalDate(matchList) {
  const map = {}
  for (const m of matchList) {
    if (!map[m.localDate]) map[m.localDate] = []
    map[m.localDate].push(m)
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
}

function PredictionCard({ match, prediction }) {
  const pick = prediction?.outcome ?? null
  const boosted = !!prediction?.boosted
  const hasResult = match.result !== null
  const correct = pick && pick === match.result

  const basePoints = correct
    ? pick === 'home'
      ? match.pointsHome
      : pick === 'draw'
        ? match.pointsDraw
        : match.pointsAway
    : 0
  const pointsEarned = boosted ? boostedPoints(basePoints) : basePoints

  const pickClass = !hasResult ? 'pending' : correct ? 'correct' : 'wrong'

  return (
    <div className={`match match--done${boosted ? ' match--boosted' : ''}`}>
      <div className="match-top">
        <span className="grp">
          {match.group ? `Gruppe ${match.group}` : (match.stage ?? '').replace(/_/g, ' ')}
        </span>
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
        {hasResult ? (
          <span className="vs result-score">
            {match.homeScore} – {match.awayScore}
          </span>
        ) : (
          <span className="vs">VS</span>
        )}
        <div className="team away">
          <TeamCrest teamName={match.awayTeam} />
          <div>
            <div className="nm">{match.awayTeam}</div>
          </div>
        </div>
      </div>
      <div className="result-row">
        {pick ? (
          <PickBadges prediction={pick} state={pickClass} />
        ) : (
          <span className="result-badge pending">Ikke tippet</span>
        )}
        {!hasResult && pick && (
          <span className="result-badge pending">Kampen er i gang</span>
        )}
        {hasResult && pick && correct && (
          <span className="result-badge correct">+{pointsEarned} p</span>
        )}
        {hasResult && pick && !correct && (
          <span className="result-badge wrong">Ingen poeng</span>
        )}
      </div>
    </div>
  )
}

export default function UserPredictionsModal({ user, byMatch, matches, onClose }) {
  const locked = matches.filter(isMatchLocked)
  const grouped = groupByLocalDate(locked)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--tall">
        <div className="modal-header">
          <div>
            <h3>{user.name}</h3>
            <div className="upred-stat">
              {user.correct} av {user.played} rette · {user.score} poeng
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {grouped.length === 0 ? (
            <p className="lb-empty-note">Ingen kamper er låst ennå.</p>
          ) : (
            grouped.map(([date, dayMatches]) => (
              <div key={date}>
                <div className="day-head">{formatDateHeading(date)}</div>
                {dayMatches.map(m => (
                  <PredictionCard key={m.id} match={m} prediction={byMatch[m.id]} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
