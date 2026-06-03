// FotMob national-team IDs, verified against fixture data from FotMob's
// search API (each ID cross-checked to pair with the expected team name).
export const FOTMOB_IDS = {
  'Algeria':               6317,
  'Argentina':             6706,
  'Australia':             6716,
  'Austria':               8255,
  'Belgium':               8263,
  'Bosnia & Herzegovina':  10106,
  'Brazil':                8256,
  'Canada':                5810,
  'Cape Verde':            5888,
  'Colombia':              8258,
  'DR Congo':              6321,
  'Croatia':               10155,
  'Curaçao':               287981,
  'Czech Republic':        8496,
  'Ecuador':               6707,
  'Egypt':                 10255,
  'England':               8491,
  'France':                6723,
  'Germany':               8570,
  'Ghana':                 6714,
  'Haiti':                 5934,
  'Iran':                  6711,
  'Iraq':                  5819,
  'Ivory Coast':           6709,
  'Japan':                 6715,
  'Jordan':                5816,
  'Mexico':                6710,
  'Morocco':               6262,
  'Netherlands':           6708,
  'New Zealand':           5820,
  'Norway':                8492,
  'Panama':                5922,
  'Paraguay':              6724,
  'Portugal':              8361,
  'Qatar':                 5902,
  'Saudi Arabia':          7795,
  'Scotland':              8498,
  'Senegal':               6395,
  'South Africa':          6316,
  'South Korea':           7804,
  'Spain':                 6720,
  'Sweden':                8520,
  'Switzerland':           6717,
  'Tunisia':               6719,
  'Turkey':                6595,
  'USA':                   6713,
  'Uruguay':               5796,
  'Uzbekistan':            8700,
}

// FotMob redirects /teams/{id}/... to the canonical slug, so the slug part
// is cosmetic — the ID is what matters.
export function getFotmobUrl(teamName) {
  const id = FOTMOB_IDS[teamName]
  if (!id) return null
  const slug = teamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://www.fotmob.com/teams/${id}/overview/${slug}`
}
