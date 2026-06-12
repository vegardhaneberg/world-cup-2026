export function isMatchLocked(match) {
  return Date.now() >= new Date(match.date).getTime() - 5 * 60 * 1000
}

export function isMatchHidden(match) {
  return (
    match.status === 'FINISHED' ||
    Date.now() >= new Date(match.date).getTime() + 3 * 60 * 60 * 1000
  )
}

export function isMatchWarning(match) {
  const lockTime = new Date(match.date).getTime() - 5 * 60 * 1000
  const warnTime = lockTime - 30 * 60 * 1000
  return Date.now() >= warnTime && !isMatchLocked(match)
}

// Norwegian labels for each knockout stage. Both LAST_16 and ROUND_OF_16 are
// mapped since football-data.org and the schema comment disagree on the string.
const KNOCKOUT_LABELS = {
  LAST_16: 'Åttedelsfinale',
  ROUND_OF_16: 'Åttedelsfinale',
  QUARTER_FINALS: 'Kvartfinale',
  QUARTER_FINAL: 'Kvartfinale',
  SEMI_FINALS: 'Semifinale',
  SEMI_FINAL: 'Semifinale',
  THIRD_PLACE: 'Bronsefinale',
  FINAL: 'Finale',
}

// Card header label: "Gruppe A · Runde 1" for group-stage matches (matchday
// 1–3), or the raw knockout stage ("SEMI FINAL") otherwise. Shared by every
// match card (upcoming, played, other users' predictions).
export function matchGroupLabel(match) {
  if (match.group) {
    return match.matchday
      ? `Gruppe ${match.group} · Runde ${match.matchday}`
      : `Gruppe ${match.group}`
  }
  return (match.stage ?? '').replace(/_/g, ' ')
}

// Booster "period": group stage → matchday (3 periods), knockouts → stage.
// Centralized so a stage rename is a one-line change. Returns { key, label }.
// Accepts a raw matches row or a transformed match (needs matchday + stage).
export function getMatchPeriod(match) {
  if (match.matchday != null) {
    return { key: `GROUP_${match.matchday}`, label: `Gruppespill – Runde ${match.matchday}` }
  }
  const stage = match.stage ?? 'UNKNOWN'
  return { key: stage, label: KNOCKOUT_LABELS[stage] ?? stage.replace(/_/g, ' ') }
}
