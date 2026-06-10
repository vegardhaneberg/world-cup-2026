import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getMatchPeriod } from '../data/matchUtils'

const PredictionContext = createContext(null)

export function PredictionProvider({ children }) {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState({})
  const [boosts, setBoosts] = useState({}) // { [matchId]: boost_period }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPredictions({})
      setBoosts({})
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('predictions')
      .select('match_id, outcome, boosted, boost_period')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const map = {}
          const boostMap = {}
          for (const row of data) {
            map[row.match_id] = row.outcome
            if (row.boosted) boostMap[row.match_id] = row.boost_period
          }
          setPredictions(map)
          setBoosts(boostMap)
        }
        setLoading(false)
      })
  }, [user?.id])

  const predict = async (matchId, outcome) => {
    if (!user) return

    const previous = predictions[matchId]
    const isToggle = previous === outcome
    const previousBoost = boosts[matchId]

    // Optimistic update
    setPredictions(prev => {
      const next = { ...prev }
      if (isToggle) delete next[matchId]
      else next[matchId] = outcome
      return next
    })
    // Removing a pick also removes its boost (the delete path drops the row)
    if (isToggle && previousBoost !== undefined) {
      setBoosts(prev => {
        const next = { ...prev }
        delete next[matchId]
        return next
      })
    }

    let error
    if (isToggle) {
      ;({ error } = await supabase
        .from('predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('match_id', matchId))
    } else {
      ;({ error } = await supabase
        .from('predictions')
        .upsert(
          { user_id: user.id, match_id: matchId, outcome, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,match_id' }
        ))
    }

    if (error) {
      // Revert on failure
      setPredictions(prev => {
        const next = { ...prev }
        if (previous !== undefined) next[matchId] = previous
        else delete next[matchId]
        return next
      })
      if (isToggle && previousBoost !== undefined) {
        setBoosts(prev => ({ ...prev, [matchId]: previousBoost }))
      }
      return error
    }
    return null
  }

  // Set / move / remove the one boost in a match's period. A pick is required.
  const boost = async (match) => {
    if (!user) return
    const matchId = match.id
    if (!predictions[matchId]) return // pick required before boosting

    const period = match.period ?? getMatchPeriod(match).key
    const isActive = boosts[matchId] !== undefined
    const prevBoosts = boosts

    if (isActive) {
      // Toggle the boost off
      setBoosts(prev => {
        const next = { ...prev }
        delete next[matchId]
        return next
      })
      const { error } = await supabase
        .from('predictions')
        .update({ boosted: false, boost_period: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('match_id', matchId)
      if (error) setBoosts(prevBoosts)
    } else {
      // Set/move the boost here, clearing any other boost in this period
      setBoosts(prev => {
        const next = {}
        for (const [id, p] of Object.entries(prev)) {
          if (p !== period) next[id] = p
        }
        next[matchId] = period
        return next
      })
      const { error } = await supabase.rpc('set_boost', { p_match_id: matchId, p_period: period })
      if (error) setBoosts(prevBoosts)
    }
  }

  return (
    <PredictionContext.Provider value={{ predictions, boosts, loading, predict, boost }}>
      {children}
    </PredictionContext.Provider>
  )
}

export function usePredictions() {
  return useContext(PredictionContext)
}
