export function isMatchLocked(match) {
  return Date.now() >= new Date(match.date).getTime() - 5 * 60 * 1000
}

export function isMatchHidden(match) {
  return Date.now() >= new Date(match.date).getTime() + 60 * 60 * 1000
}
