const OUTCOMES = ['home', 'draw', 'away']
const OUTCOME_LABEL = { home: 'H', draw: 'U', away: 'B' }

// Shows all three H/U/B options, highlighting the predicted one.
// state: 'correct' | 'wrong' | 'pending' — applied to the picked badge.
export default function PickBadges({ prediction, state }) {
  return (
    <div className="pick-badges">
      {OUTCOMES.map(o => (
        <span
          key={o}
          className={`pick-badge ${o === prediction ? state : 'muted'}`}
        >
          {OUTCOME_LABEL[o]}
        </span>
      ))}
    </div>
  )
}
