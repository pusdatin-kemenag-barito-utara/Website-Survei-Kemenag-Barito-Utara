import { useState, useEffect } from 'react'
import { fetchCachedPublicResults, getCachedPublicResultsSync } from '@/lib/data-cache'
import { pb } from '@/lib/pocketbase'
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
    return () => {
      isMounted = false
    }
  }, [])

  // PocketBase Realtime refresh on new survey responses
  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    async function subscribeRealtime() {
      try {
        unsubscribe = await pb.collection('responses').subscribe('*', async () => {
          try {
            const res = await fetchCachedPublicResults(true)
            setData(res as PublicResultsData)
            setError(null)
          } catch {}
        })
      } catch {}
    }

    subscribeRealtime()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      } else {
        pb.collection('responses').unsubscribe('*').catch(() => {})
      }
    }
  }, [])

  return { data, loading, error }
}
