import { pb } from '@/lib/pocketbase'
import { apiFetch } from '@/lib/api'
import type { Service, Unsur, Question, DemographicField, SurveyPeriod } from '@/types'
import type { AdminStatsResponse, PublicResultsResponse } from './types'
import {
  cachedAdminServices,
  cachedAdminUnsur,
  cachedAdminQuestions,
  cachedAdminDemographics,
  cachedAdminPeriods,
  cachedAdminStats,
  inflightAdminServices,
  inflightAdminUnsur,
  inflightAdminQuestions,
  inflightAdminDemographics,
  inflightAdminPeriods,
  inflightAdminStats,
  hasPrefetchedAdmin,
  setCachedAdminServices,
  setCachedAdminUnsur,
  setCachedAdminQuestions,
  setCachedAdminDemographics,
  setCachedAdminPeriods,
  setCachedAdminStats,
  setInflightAdminServices,
  setInflightAdminUnsur,
  setInflightAdminQuestions,
  setInflightAdminDemographics,
  setInflightAdminPeriods,
  setInflightAdminStats,
  setHasPrefetchedAdmin,
  getSession,
  setSession,
} from './cache-store'
import { fetchAdminResponsesWithFallback } from './admin-responses'

// Admin Data Fetchers
export async function fetchCachedAdminServices(forceRefresh = false): Promise<Service[]> {
  if (!forceRefresh) {
    if (cachedAdminServices) return cachedAdminServices
    const sess = getSession<Service[]>('admin_services')
    if (sess) {
      setCachedAdminServices(sess)
      return sess
    }
  }
  if (inflightAdminServices) return inflightAdminServices

  const inflight = (async () => {
    try {
      const data = await pb.collection('services').getFullList({ sort: 'sort_order' })
      const list = data as unknown as Service[]
      setCachedAdminServices(list)
      setSession('admin_services', list)
      return list
    } catch (err) {
      console.warn('[DataCache] PocketBase services fetch failed, trying API fallback:', err)
      try {
        const list = await apiFetch<Service[]>('/admin/services')
        setCachedAdminServices(list)
        setSession('admin_services', list)
        return list
      } catch {
        throw err
      }
    } finally {
      setInflightAdminServices(null)
    }
  })()

  setInflightAdminServices(inflight)
  return inflight
}

export async function fetchCachedAdminUnsur(forceRefresh = false): Promise<Unsur[]> {
  if (!forceRefresh) {
    if (cachedAdminUnsur) return cachedAdminUnsur
    const sess = getSession<Unsur[]>('admin_unsur')
    if (sess) {
      setCachedAdminUnsur(sess)
      return sess
    }
  }
  if (inflightAdminUnsur) return inflightAdminUnsur

  const inflight = (async () => {
    try {
      const data = await pb.collection('unsur').getFullList({ sort: 'sort_order' })
      const list = data as unknown as Unsur[]
      setCachedAdminUnsur(list)
      setSession('admin_unsur', list)
      return list
    } catch (err) {
      console.warn('[DataCache] PocketBase unsur fetch failed, trying API fallback:', err)
      try {
        const list = await apiFetch<Unsur[]>('/admin/unsur')
        setCachedAdminUnsur(list)
        setSession('admin_unsur', list)
        return list
      } catch {
        throw err
      }
    } finally {
      setInflightAdminUnsur(null)
    }
  })()

  setInflightAdminUnsur(inflight)
  return inflight
}

export async function fetchCachedAdminQuestions(forceRefresh = false): Promise<Question[]> {
  if (!forceRefresh) {
    if (cachedAdminQuestions) return cachedAdminQuestions
    const sess = getSession<Question[]>('admin_questions')
    if (sess) {
      setCachedAdminQuestions(sess)
      return sess
    }
  }
  if (inflightAdminQuestions) return inflightAdminQuestions

  const inflight = (async () => {
    try {
      const data = await pb.collection('questions').getFullList({ sort: 'sort_order', expand: 'unsur' })
      const list = data.map((q: any) => {
        const rawUnsurId = (typeof q.unsur === 'object' && q.unsur?.id ? q.unsur.id : q.unsur) || q.unsur_id || q.expand?.unsur?.id || ''
        const rawServiceId = (typeof q.service === 'object' && q.service?.id ? q.service.id : q.service) ?? (q.service_id ?? null)
        return {
          ...(q as unknown as Question),
          unsur_id: String(rawUnsurId),
          service_id: rawServiceId ? String(rawServiceId) : null,
          unsur: (q.expand?.unsur as unknown as Unsur) || undefined,
        }
      })
      setCachedAdminQuestions(list)
      setSession('admin_questions', list)
      return list
    } catch (err) {
      console.warn('[DataCache] PocketBase questions fetch failed, trying API fallback:', err)
      try {
        const list = await apiFetch<Question[]>('/admin/questions')
        setCachedAdminQuestions(list)
        setSession('admin_questions', list)
        return list
      } catch {
        throw err
      }
    } finally {
      setInflightAdminQuestions(null)
    }
  })()

  setInflightAdminQuestions(inflight)
  return inflight
}

export async function fetchCachedAdminDemographics(forceRefresh = false): Promise<DemographicField[]> {
  if (!forceRefresh) {
    if (cachedAdminDemographics) return cachedAdminDemographics
    const sess = getSession<DemographicField[]>('admin_demographics')
    if (sess) {
      setCachedAdminDemographics(sess)
      return sess
    }
  }
  if (inflightAdminDemographics) return inflightAdminDemographics

  const inflight = (async () => {
    try {
      const data = await pb.collection('demographic_fields').getFullList({ sort: 'sort_order' })
      const list = data as unknown as DemographicField[]
      setCachedAdminDemographics(list)
      setSession('admin_demographics', list)
      return list
    } catch (err) {
      console.warn('[DataCache] PocketBase demographics fetch failed, trying API fallback:', err)
      try {
        const list = await apiFetch<DemographicField[]>('/admin/demographics')
        setCachedAdminDemographics(list)
        setSession('admin_demographics', list)
        return list
      } catch {
        throw err
      }
    } finally {
      setInflightAdminDemographics(null)
    }
  })()

  setInflightAdminDemographics(inflight)
  return inflight
}

export async function fetchCachedAdminPeriods(forceRefresh = false): Promise<SurveyPeriod[]> {
  if (!forceRefresh) {
    if (cachedAdminPeriods && cachedAdminPeriods.length > 0) return cachedAdminPeriods
    const sess = getSession<SurveyPeriod[]>('admin_periods')
    if (sess && sess.length > 0) {
      setCachedAdminPeriods(sess)
      return sess
    }
  }
  if (inflightAdminPeriods) return inflightAdminPeriods

  const inflight = (async () => {
    // 1. Direct PocketBase fetch with 3.5s timeout
    try {
      const pbFetchPromise = pb.collection('survey_periods').getFullList({ sort: '-start_date' })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PocketBase timeout')), 3500)
      )
      const data = await Promise.race([pbFetchPromise, timeoutPromise])
      const list = data as unknown as SurveyPeriod[]
      if (Array.isArray(list) && list.length > 0) {
        setCachedAdminPeriods(list)
        setSession('admin_periods', list)
        return list
      }
    } catch (err) {
      console.warn('[DataCache] PocketBase survey_periods fetch failed/timed out, trying backend fallback:', err)
    }

    // 2. Protected backend fallback (/admin/periods) with 3.5s timeout
    try {
      const adminPromise = apiFetch<SurveyPeriod[]>('/admin/periods')
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Admin API timeout')), 3500)
      )
      const list = await Promise.race([adminPromise, timeoutPromise])
      if (Array.isArray(list) && list.length > 0) {
        setCachedAdminPeriods(list)
        setSession('admin_periods', list)
        return list
      }
    } catch (err) {
      console.warn('[DataCache] Admin periods API fallback failed, trying public survey periods:', err)
    }

    // 3. Public backend fallback (/survey/periods) with 3.5s timeout
    try {
      const publicPromise = apiFetch<SurveyPeriod[]>('/survey/periods')
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Public API timeout')), 3500)
      )
      const list = await Promise.race([publicPromise, timeoutPromise])
      if (Array.isArray(list) && list.length > 0) {
        setCachedAdminPeriods(list)
        setSession('admin_periods', list)
        return list
      }
    } catch (err) {
      console.error('[DataCache] All period fetch strategies failed:', err)
    }

    // 4. Stale cache fallback if all network requests fail
    const fallback = cachedAdminPeriods || getSession<SurveyPeriod[]>('admin_periods') || []
    return fallback
  })().finally(() => {
    setInflightAdminPeriods(null)
  })

  setInflightAdminPeriods(inflight)
  return inflight
}

export async function fetchCachedAdminStats(forceRefresh = false): Promise<AdminStatsResponse> {
  if (!forceRefresh) {
    if (cachedAdminStats) return cachedAdminStats
    const sess = getSession<AdminStatsResponse>('admin_stats')
    if (sess) {
      setCachedAdminStats(sess)
      return sess
    }
  }
  if (inflightAdminStats) return inflightAdminStats

  const inflight = (async () => {
    try {
      // 1. Try Go backend /admin/stats via apiFetch first (super fast in-memory cache, 2.5s timeout)
      try {
        const fetchPromise = apiFetch<AdminStatsResponse>('/admin/stats')
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Admin stats timeout')), 2500)
        )
        const backendStats = await Promise.race([fetchPromise, timeoutPromise])
        if (backendStats && typeof backendStats.total_responses === 'number') {
          setCachedAdminStats(backendStats)
          setSession('admin_stats', backendStats)
          return backendStats
        }
      } catch (err) {
        console.warn('[DataCache] /admin/stats failed or timed out, using fast public stats fallback:', err)
      }

      // 2. Fast Fallback: /survey/public-results + services + periods (pre-warmed in Go backend, instant ~10ms)
      try {
        const pubPromise = apiFetch<PublicResultsResponse>('/survey/public-results')
        const srvPromise = fetchCachedAdminServices(forceRefresh).catch(() => [])
        const unsPromise = fetchCachedAdminUnsur(forceRefresh).catch(() => [])
        const perPromise = fetchCachedAdminPeriods(forceRefresh).catch(() => [])

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Public fallback timeout')), 2500)
        )

        const [publicRes, servicesList, unsurList, periodsList] = await Promise.race([
          Promise.all([pubPromise, srvPromise, unsPromise, perPromise]),
          timeoutPromise,
        ])

        const stats: AdminStatsResponse = {
          total_responses: publicRes.total_responses ?? 0,
          active_services: Array.isArray(servicesList) ? servicesList.filter((s) => s.is_active).length : 0,
          total_unsur: Array.isArray(unsurList) ? unsurList.filter((u) => u.is_active).length : (publicRes.unsur_summary?.length ?? 14),
          active_period: (Array.isArray(periodsList) && periodsList.find((p) => p.is_active)) || publicRes.period || null,
          ipkp_score: publicRes.ipkp_score ?? null,
          ipak_score: publicRes.ipak_score ?? null,
        }
        setCachedAdminStats(stats)
        setSession('admin_stats', stats)
        return stats
      } catch (err) {
        console.warn('[DataCache] Fast public stats fallback failed:', err)
      }

      // 3. Last-resort fallback from session cache or clean zero-state
      const fallback = cachedAdminStats || getSession<AdminStatsResponse>('admin_stats') || {
        total_responses: 0,
        active_services: 0,
        total_unsur: 0,
        active_period: null,
        ipkp_score: null,
        ipak_score: null,
      }
      return fallback
    } finally {
      setInflightAdminStats(null)
    }
  })()

  setInflightAdminStats(inflight)
  return inflight
}

// Prefetch all admin metadata asynchronously for instant tab switching
export function prefetchAllAdminData() {
  if (typeof window === 'undefined') return
  if (hasPrefetchedAdmin) return

  setHasPrefetchedAdmin(true)

  setTimeout(() => {
    fetchCachedAdminStats().catch(() => {})
  }, 50)

  setTimeout(() => {
    fetchCachedAdminServices().catch(() => {})
  }, 200)

  setTimeout(() => {
    fetchCachedAdminPeriods().catch(() => {})
  }, 400)

  setTimeout(() => {
    fetchCachedAdminUnsur().catch(() => {})
  }, 600)

  setTimeout(() => {
    fetchCachedAdminDemographics().catch(() => {})
  }, 800)

  setTimeout(() => {
    fetchCachedAdminQuestions().catch(() => {})
  }, 1000)

  setTimeout(() => {
    fetchAdminResponsesWithFallback().catch(() => {})
  }, 1200)
}
