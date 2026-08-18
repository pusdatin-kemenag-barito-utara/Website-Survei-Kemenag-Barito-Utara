import { useState, useEffect } from 'react'
import { fetchCachedPublicResults, getCachedPublicResultsSync } from '@/lib/data-cache'
import { createClient } from '@/lib/supabase/client'
import type { IndexSummary, UnsurSummary, IndexByService } from '@/types'

export interface PublicResultsData {
  total_responses: number
  ipkp_score: number
  ipak_score: number
  ikm_score: number
  index_summary: IndexSummary[]
  unsur_summary: UnsurSummary[]
  by_service: IndexByService[]
}

export function usePublicResults() {
  const initialCache = getCachedPublicResultsSync()
  const [data, setData] = useState<PublicResultsData | null>(initialCache as PublicResultsData | null)
  const [loading, setLoading] = useState<boolean>(!initialCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const res = await fetchCachedPublicResults()
        if (isMounted) {
          setData(res as PublicResultsData)
          setError(null)
        }
      } catch (err: unknown) {
        if (isMounted && !data) {
          const message = err instanceof Error ? err.message : 'Failed to load public survey results'
          setError(message)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => { isMounted = false }
  }, [])

  // Realtime refresh
  useEffect(() => {
    const supabase = createClient()
    if (!supabase || typeof supabase.channel !== 'function') return

    const channel = supabase
      .channel('home-public-results-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'kemenag_survey', table: 'responses' },
        async () => {
          try {
            const res = await fetchCachedPublicResults(true)
            setData(res as PublicResultsData)
            setError(null)
          } catch {}
        }
      )
      .subscribe()

    return () => {
      if (channel && supabase && typeof supabase.removeChannel === 'function') {
        try {
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [])

  return { data, loading, error }
}
