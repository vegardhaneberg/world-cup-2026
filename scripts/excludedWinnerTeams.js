// Teams the bookmakers price in the tournament-winner ('outrights') market but
// that did NOT qualify for World Cup 2026. They must never be offered as a
// Verdensmester pick, so:
//   - seed-winner-odds.js skips them when seeding outcomes
//   - sync-winner-odds.js deletes any that already exist and never re-adds them
//
// Keep in sync with the qualified field; remove a name here if a team later
// qualifies (e.g. via play-offs).
export const EXCLUDED_WINNER_TEAMS = new Set([
  'Bolivia',
  'Denmark',
  'Italy',
  'Jamaica',
  'Kosovo',
  'Poland',
]);
