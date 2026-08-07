import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
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

async function fetchPublicResults(): Promise<PublicResultsData> {
  return apiFetch<PublicResultsData>('/survey/public-results')
}

export function usePublicResults() {
  const [data, setData] = useState<PublicResultsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Initial data fetch — inline async function is the React-recommended pattern
  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const res = await fetchPublicResults()
        if (isMounted) {
          setData(res)
          setError(null)
        }
      } catch (err: unknown) {
        if (isMounted) {
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

  // Realtime refresh — setState called inside a subscription callback (accepted React pattern)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      ?.channel('home-public-results-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'kemenag_survey', table: 'responses' },
        async () => {
          try {
            const res = await fetchPublicResults()
            setData(res)
            setError(null)
          } catch {
            // Silently ignore realtime refresh failures
          }
        }
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return { data, loading, error }
}
