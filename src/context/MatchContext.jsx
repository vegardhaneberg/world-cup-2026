import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getMatchPoints } from '../data/scoring'
import { isMatchHidden } from '../data/matchUtils'

const MatchContext = createContext(null)

function transformMatch(row, oddsMap) {
  const oddsRow = oddsMap ? oddsMap.get(row.id) : null
  const pts = getMatchPoints(row.home_team, row.away_team, oddsRow)
  const isEven = pts.oddsH != null && pts.oddsB != null
    && Math.min(pts.oddsH, pts.oddsB) >= 2.4

  // Local date in Oslo timezone (YYYY-MM-DD)
  const localDate = new Date(row.utc_date).toLocaleDateString('sv', { timeZone: 'Europe/Oslo' })

  const city = row.venue ? row.venue.split('(')[0].trim().split(',')[0].trim() : ''

  // GROUP_A → A, null for knockouts
  const group = row.group ? row.group.replace('GROUP_', '') : null

  const round = row.matchday ? `Matchday ${row.matchday}` : row.stage

  return {
    id: row.id,
    group,
    round,
    stage: row.stage,
    localDate,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    date: row.utc_date,
    city,
    venue: row.venue,
    status: row.status,
    result: row.result ?? null,
    homeScore: row.home_score ?? null,
    awayScore: row.away_score ?? null,
    pointsHome: pts.home,
    pointsDraw: pts.draw,
    pointsAway: pts.away,
    isEven,
  }
}

export function MatchProvider({ children }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  async function fetchData() {
    const [matchesResult, oddsResult] = await Promise.all([
      supabase.from('matches').select('*').order('utc_date', { ascending: true }),
      supabase.from('odds').select('*'),
    ])

    if (!matchesResult.error && matchesResult.data) {
      const oddsMap = new Map((oddsResult.data ?? []).map(o => [o.match_id, o]))
      setMatches(matchesResult.data.map(row => transformMatch(row, oddsMap)))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    channelRef.current = supabase
      .channel('matches_odds_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'odds' }, fetchData)
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  function getActiveMatches() {
    const upcoming = matches.filter(m => !isMatchHidden(m))
    if (!upcoming.length) return []
    const sorted = [...upcoming].sort((a, b) => a.localDate.localeCompare(b.localDate))
    const firstDate = sorted[0].localDate
    return upcoming.filter(m => m.localDate === firstDate)
  }

  function getUpcomingMatchDays() {
    const upcoming = matches.filter(m => !isMatchHidden(m))
    if (upcoming.length <= 1) return []
    const sorted = [...upcoming].sort((a, b) => a.localDate.localeCompare(b.localDate))
    const firstDate = sorted[0].localDate
    const later = sorted.filter(m => m.localDate !== firstDate)

    const grouped = later.reduce((acc, m) => {
      if (!acc[m.localDate]) acc[m.localDate] = []
      acc[m.localDate].push(m)
      return acc
    }, {})

    return Object.entries(grouped).map(([date, matchList]) => ({
      date,
      dayLabel: new Date(date + 'T12:00:00Z').toLocaleDateString('no', {
        weekday: 'long', day: 'numeric', month: 'long',
      }),
      matches: matchList,
    }))
  }

  return (
    <MatchContext.Provider value={{ matches, loading, getActiveMatches, getUpcomingMatchDays }}>
      {children}
    </MatchContext.Provider>
  )
}

export function useMatches() {
  return useContext(MatchContext)
}
