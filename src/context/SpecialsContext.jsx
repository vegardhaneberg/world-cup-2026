import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { isSpecialLocked } from '../data/specials'

const SpecialsContext = createContext(null)

export function SpecialsProvider({ children }) {
  const { user } = useAuth()
  const [markets, setMarkets] = useState([]) // [{ ...market, outcomes: [...] }]
  const [picks, setPicks] = useState({})     // { [marketId]: outcomeId }
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  async function fetchMarkets() {
    const [marketsRes, outcomesRes] = await Promise.all([
      supabase.from('special_markets').select('*'),
      supabase.from('special_outcomes').select('*'),
    ])
    if (!marketsRes.error && marketsRes.data) {
      const byMarket = {}
      for (const o of outcomesRes.data ?? []) {
        if (!byMarket[o.market_id]) byMarket[o.market_id] = []
        byMarket[o.market_id].push(o)
      }
      for (const id in byMarket) byMarket[id].sort((a, b) => a.sort - b.sort)
      setMarkets(marketsRes.data.map(m => ({ ...m, outcomes: byMarket[m.id] ?? [] })))
    }
    setLoading(false)
  }

  async function fetchPicks() {
    if (!user) {
      setPicks({})
      return
    }
    const { data, error } = await supabase
      .from('special_predictions')
      .select('market_id, outcome_id')
      .eq('user_id', user.id)
    if (!error && data) {
      const map = {}
      for (const row of data) map[row.market_id] = row.outcome_id
      setPicks(map)
    }
  }

  // Markets/outcomes load once + subscribe to realtime changes.
  useEffect(() => {
    fetchMarkets()

    channelRef.current = supabase
      .channel('specials_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_markets' }, fetchMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_outcomes' }, fetchMarkets)
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  // The current user's picks reload whenever the user changes.
  useEffect(() => {
    fetchPicks()
  }, [user?.id])

  // Single-select: tap a team to pick it, tap the same team again to clear.
  // Optimistic update mirroring PredictionContext.predict.
  const pickSpecial = async (marketId, outcomeId) => {
    if (!user) return
    const market = markets.find(m => m.id === marketId)
    if (market && isSpecialLocked(market)) return // locked: no changes after kickoff

    const previous = picks[marketId]
    const isToggle = previous === outcomeId

    setPicks(prev => {
      const next = { ...prev }
      if (isToggle) delete next[marketId]
      else next[marketId] = outcomeId
      return next
    })

    let error
    if (isToggle) {
      ;({ error } = await supabase
        .from('special_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('market_id', marketId))
    } else {
      ;({ error } = await supabase
        .from('special_predictions')
        .upsert(
          { user_id: user.id, market_id: marketId, outcome_id: outcomeId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,market_id' }
        ))
    }

    if (error) {
      // Revert on failure
      setPicks(prev => {
        const next = { ...prev }
        if (previous !== undefined) next[marketId] = previous
        else delete next[marketId]
        return next
      })
    }
  }

  return (
    <SpecialsContext.Provider value={{ markets, picks, loading, pickSpecial }}>
      {children}
    </SpecialsContext.Provider>
  )
}

export function useSpecials() {
  return useContext(SpecialsContext)
}
