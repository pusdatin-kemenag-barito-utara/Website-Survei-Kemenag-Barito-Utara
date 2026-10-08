import type {
  Service,
  Question,
  DemographicField,
  Unsur,
  SurveyPeriod,
} from '@/types'
import type {
  PublicResultsResponse,
  ArchiveResultsResponse,
  FormQuestionsResponse,
  AdminStatsResponse,
  AdminResponsesResult,
} from './types'

// In-Memory Client Cache Store
export let cachedPublicResults: PublicResultsResponse | null = null
export let cachedServices: Service[] | null = null
export let cachedPeriods: SurveyPeriod[] | null = null
export let cachedFormQuestions: FormQuestionsResponse | null = null
export const cachedArchiveResults: Record<string, ArchiveResultsResponse> = {}

// Admin Cache Store
export let cachedAdminServices: Service[] | null = null
export let cachedAdminUnsur: Unsur[] | null = null
export let cachedAdminQuestions: Question[] | null = null
export let cachedAdminDemographics: DemographicField[] | null = null
export let cachedAdminPeriods: SurveyPeriod[] | null = null
export let cachedAdminStats: AdminStatsResponse | null = null
export let cachedAdminResponses: AdminResponsesResult | null = null

// In-Flight Promise Deduping Store
export let inflightPublicResults: Promise<PublicResultsResponse> | null = null
export let inflightServices: Promise<Service[]> | null = null
export let inflightPeriods: Promise<SurveyPeriod[]> | null = null
export let inflightFormQuestions: Promise<FormQuestionsResponse> | null = null
export const inflightArchiveResults: Record<string, Promise<ArchiveResultsResponse> | null> = {}

export let inflightAdminServices: Promise<Service[]> | null = null
export let inflightAdminUnsur: Promise<Unsur[]> | null = null
export let inflightAdminQuestions: Promise<Question[]> | null = null
export let inflightAdminDemographics: Promise<DemographicField[]> | null = null
export let inflightAdminPeriods: Promise<SurveyPeriod[]> | null = null
export let inflightAdminStats: Promise<AdminStatsResponse> | null = null
export let inflightAdminResponses: Promise<AdminResponsesResult> | null = null

export let hasPrefetchedAdmin = false

// Setters for mutable cache variables from separate modules
export function setCachedPublicResults(val: PublicResultsResponse | null) { cachedPublicResults = val }
export function setCachedServices(val: Service[] | null) { cachedServices = val }
export function setCachedPeriods(val: SurveyPeriod[] | null) { cachedPeriods = val }
export function setCachedFormQuestions(val: FormQuestionsResponse | null) { cachedFormQuestions = val }

export function setCachedAdminServices(val: Service[] | null) { cachedAdminServices = val }
export function setCachedAdminUnsur(val: Unsur[] | null) { cachedAdminUnsur = val }
export function setCachedAdminQuestions(val: Question[] | null) { cachedAdminQuestions = val }
export function setCachedAdminDemographics(val: DemographicField[] | null) { cachedAdminDemographics = val }
export function setCachedAdminPeriods(val: SurveyPeriod[] | null) { cachedAdminPeriods = val }
export function setCachedAdminStats(val: AdminStatsResponse | null) { cachedAdminStats = val }
export function setCachedAdminResponses(val: AdminResponsesResult | null) { cachedAdminResponses = val }

export function setInflightPublicResults(val: Promise<PublicResultsResponse> | null) { inflightPublicResults = val }
export function setInflightServices(val: Promise<Service[]> | null) { inflightServices = val }
export function setInflightPeriods(val: Promise<SurveyPeriod[]> | null) { inflightPeriods = val }
export function setInflightFormQuestions(val: Promise<FormQuestionsResponse> | null) { inflightFormQuestions = val }

export function setInflightAdminServices(val: Promise<Service[]> | null) { inflightAdminServices = val }
export function setInflightAdminUnsur(val: Promise<Unsur[]> | null) { inflightAdminUnsur = val }
export function setInflightAdminQuestions(val: Promise<Question[]> | null) { inflightAdminQuestions = val }
export function setInflightAdminDemographics(val: Promise<DemographicField[]> | null) { inflightAdminDemographics = val }
export function setInflightAdminPeriods(val: Promise<SurveyPeriod[]> | null) { inflightAdminPeriods = val }
export function setInflightAdminStats(val: Promise<AdminStatsResponse> | null) { inflightAdminStats = val }
export function setInflightAdminResponses(val: Promise<AdminResponsesResult> | null) { inflightAdminResponses = val }

export function setHasPrefetchedAdmin(val: boolean) { hasPrefetchedAdmin = val }

export const CACHE_VERSION = 'si_arus_v2_20261008'

// Automatic version check to purge stale session storage from prior states
if (typeof window !== 'undefined') {
  try {
    const curVer = sessionStorage.getItem('si_arus_cache_ver')
    if (curVer !== CACHE_VERSION) {
      const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('si_arus_'))
      keys.forEach((k) => sessionStorage.removeItem(k))
      sessionStorage.setItem('si_arus_cache_ver', CACHE_VERSION)
    }
  } catch {}
}

interface CacheEnvelope<T> {
  ts: number
  data: T
}

// SessionStorage Helpers with TTL (Time-To-Live)
export function getSession<T>(key: string, maxAgeMs = 30_000): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`si_arus_${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'ts' in parsed && 'data' in parsed) {
      if (maxAgeMs > 0 && Date.now() - parsed.ts > maxAgeMs) {
        sessionStorage.removeItem(`si_arus_${key}`)
        return null
      }
      return parsed.data as T
    }
    // Legacy un-enveloped format: discard to prevent stale states
    sessionStorage.removeItem(`si_arus_${key}`)
    return null
  } catch {
    return null
  }
}

export function setSession<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const envelope: CacheEnvelope<T> = {
      ts: Date.now(),
      data,
    }
    sessionStorage.setItem(`si_arus_${key}`, JSON.stringify(envelope))
  } catch {}
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('si_arus_') && k !== 'si_arus_cache_ver')
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {}
}

// Synchronous Getters (Memory + SessionStorage for 0ms instant display with TTL)
export function getCachedPublicResultsSync(): PublicResultsResponse | null {
  return cachedPublicResults || getSession<PublicResultsResponse>('public_results', 60_000)
}

export function getCachedServicesSync(): Service[] | null {
  return cachedServices || getSession<Service[]>('public_services', 120_000)
}

export function getCachedPeriodsSync(): SurveyPeriod[] | null {
  return cachedPeriods || cachedAdminPeriods || getSession<SurveyPeriod[]>('public_periods', 120_000)
}

export function getCachedFormQuestionsSync(): FormQuestionsResponse | null {
  return cachedFormQuestions || getSession<FormQuestionsResponse>('form_questions', 120_000)
}

export function getCachedArchiveResultsSync(startDate: string, endDate: string): ArchiveResultsResponse | null {
  const key = `${startDate}_${endDate}`
  return cachedArchiveResults[key] || getSession<ArchiveResultsResponse>(`archive_${key}`, 15_000)
}

export function getCachedAdminServicesSync(): Service[] | null {
  return cachedAdminServices || getSession<Service[]>('admin_services', 60_000)
}

export function getCachedAdminUnsurSync(): Unsur[] | null {
  return cachedAdminUnsur || getSession<Unsur[]>('admin_unsur', 60_000)
}

export function getCachedAdminQuestionsSync(): Question[] | null {
  return cachedAdminQuestions || getSession<Question[]>('admin_questions', 60_000)
}

export function getCachedAdminDemographicsSync(): DemographicField[] | null {
  return cachedAdminDemographics || getSession<DemographicField[]>('admin_demographics', 60_000)
}

export function getCachedAdminPeriodsSync(): SurveyPeriod[] | null {
  return cachedAdminPeriods || getSession<SurveyPeriod[]>('admin_periods', 60_000)
}

export function getCachedAdminStatsSync(): AdminStatsResponse | null {
  return cachedAdminStats || getSession<AdminStatsResponse>('admin_stats', 15_000)
}

export function getCachedAdminResponsesSync(): AdminResponsesResult | null {
  return cachedAdminResponses || getSession<AdminResponsesResult>('admin_responses_default', 15_000)
}

// Invalidate Client Cache
export function invalidateClientCache() {
  cachedPublicResults = null
  cachedServices = null
  cachedPeriods = null
  cachedFormQuestions = null
  cachedAdminServices = null
  cachedAdminUnsur = null
  cachedAdminQuestions = null
  cachedAdminDemographics = null
  cachedAdminPeriods = null
  cachedAdminStats = null
  cachedAdminResponses = null
  hasPrefetchedAdmin = false
  for (const k of Object.keys(cachedArchiveResults)) {
    delete cachedArchiveResults[k]
  }
  clearSession()
}
