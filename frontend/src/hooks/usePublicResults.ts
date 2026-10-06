import { useState, useEffect } from 'react'
import { fetchCachedPublicResults, getCachedPublicResultsSync } from '@/lib/data-cache'
import { getPocketBase } from '@/lib/pocketbase/client'
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

  // Realtime refresh via PocketBase SSE
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      const pb = getPocketBase()
      pb.collection('responses').subscribe('*', async (e) => {
        if (e.action === 'create' || e.action === 'delete') {
          try {
            const res = await fetchCachedPublicResults(true)
            setData(res as PublicResultsData)
            setError(null)
          } catch {}
        }
      }).then((unsub) => {
        unsubscribe = unsub
      }).catch((err) => {
        console.warn('[PocketBase] Realtime subscribe error:', err)
      })
    } catch {}

    return () => {
      if (unsubscribe) {
        try { unsubscribe() } catch {}
      } else {
        try { getPocketBase().collection('responses').unsubscribe('*') } catch {}
      }
    }
  }, [])

  return { data, loading, error }
}
