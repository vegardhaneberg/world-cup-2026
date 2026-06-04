export function isMatchLocked(match) {
  return Date.now() >= new Date(match.date).getTime() - 5 * 60 * 1000
}

export function isMatchHidden(match) {
  return Date.now() >= new Date(match.date).getTime() + 60 * 60 * 1000
}

export function isMatchWarning(match) {
  const lockTime = new Date(match.date).getTime() - 5 * 60 * 1000
  const warnTime = lockTime - 30 * 60 * 1000
  return Date.now() >= warnTime && !isMatchLocked(match)
}

