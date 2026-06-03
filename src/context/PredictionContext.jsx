import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const PredictionContext = createContext(null)

export function PredictionProvider({ children }) {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPredictions({})
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('predictions')
      .select('match_id, outcome')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const map = {}
          for (const row of data) map[row.match_id] = row.outcome
          setPredictions(map)
        }
        setLoading(false)
      })
  }, [user?.id])

  const predict = async (matchId, outcome) => {
    if (!user) return

    const previous = predictions[matchId]
    const isToggle = previous === outcome

    // Optimistic update
    setPredictions(prev => {
      const next = { ...prev }
      if (isToggle) delete next[matchId]
      else next[matchId] = outcome
      return next
    })

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
    }
  }

  return (
    <PredictionContext.Provider value={{ predictions, loading, predict }}>
      {children}
    </PredictionContext.Provider>
  )
}

export function usePredictions() {
  return useContext(PredictionContext)
}
