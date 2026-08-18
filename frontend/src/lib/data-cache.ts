import { apiFetch } from '@/lib/api'
import type {
  Service,
  Question,
  DemographicField,
  IndexSummary,
  UnsurSummary,
  IndexByService,
  IndexTrend,
  DemographicSummary,
  Unsur,
  SurveyPeriod,
} from '@/types'

export interface PublicResultsResponse {
  ikm_score?: number
  index_summary?: IndexSummary[]
  unsur_summary?: UnsurSummary[]
  by_service?: IndexByService[]
  trend?: IndexTrend[]
  demographics?: DemographicSummary[]
  total_responses?: number
  ipkp_score?: number
  ipak_score?: number
}

export interface ArchiveResultsResponse {
  total_responses: number
  ipkp_score: number
  ipak_score: number
  by_service?: IndexByService[]
  unsur_summary?: UnsurSummary[]
  demographics?: DemographicSummary[]
  trend?: IndexTrend[]
  index_summary?: IndexSummary[]
}

export interface FormQuestionsResponse {
  questions: Question[]
  demographic_fields: DemographicField[]
}

export interface ServicesResponse {
  services: Service[]
  categories?: any[]
}

export interface AdminStatsResponse {
  total_responses?: number
  active_services?: number
  total_unsur?: number
  active_period?: SurveyPeriod | null
  ipkp_score?: number
  ipak_score?: number
}

// In-Memory Client Cache Store
let cachedPublicResults: PublicResultsResponse | null = null
let cachedServices: Service[] | null = null
let cachedFormQuestions: FormQuestionsResponse | null = null
const cachedArchiveResults: Record<string, ArchiveResultsResponse> = {}

// Admin Cache Store
let cachedAdminServices: Service[] | null = null
let cachedAdminUnsur: Unsur[] | null = null
let cachedAdminQuestions: Question[] | null = null
let cachedAdminDemographics: DemographicField[] | null = null
let cachedAdminPeriods: SurveyPeriod[] | null = null
let cachedAdminStats: AdminStatsResponse | null = null

let inflightPublicResults: Promise<PublicResultsResponse> | null = null
let inflightServices: Promise<Service[]> | null = null
let inflightFormQuestions: Promise<FormQuestionsResponse> | null = null
const inflightArchiveResults: Record<string, Promise<ArchiveResultsResponse> | null> = {}

let inflightAdminServices: Promise<Service[]> | null = null
let inflightAdminUnsur: Promise<Unsur[]> | null = null
let inflightAdminQuestions: Promise<Question[]> | null = null
let inflightAdminDemographics: Promise<DemographicField[]> | null = null
let inflightAdminPeriods: Promise<SurveyPeriod[]> | null = null
let inflightAdminStats: Promise<AdminStatsResponse> | null = null

// Synchronous Getters
export function getCachedPublicResultsSync(): PublicResultsResponse | null {
  return cachedPublicResults
}

export function getCachedServicesSync(): Service[] | null {
  return cachedServices
}

export function getCachedFormQuestionsSync(): FormQuestionsResponse | null {
  return cachedFormQuestions
}

export function getCachedArchiveResultsSync(startDate: string, endDate: string): ArchiveResultsResponse | null {
  const key = `${startDate}_${endDate}`
  return cachedArchiveResults[key] || null
}

export function getCachedAdminServicesSync(): Service[] | null {
  return cachedAdminServices
}

export function getCachedAdminUnsurSync(): Unsur[] | null {
  return cachedAdminUnsur
}

export function getCachedAdminQuestionsSync(): Question[] | null {
  return cachedAdminQuestions
}

export function getCachedAdminDemographicsSync(): DemographicField[] | null {
  return cachedAdminDemographics
}

export function getCachedAdminPeriodsSync(): SurveyPeriod[] | null {
  return cachedAdminPeriods
}

export function getCachedAdminStatsSync(): AdminStatsResponse | null {
  return cachedAdminStats
}

// Public Data Fetchers
export async function fetchCachedPublicResults(forceRefresh = false): Promise<PublicResultsResponse> {
  if (!forceRefresh && cachedPublicResults) return cachedPublicResults
  if (inflightPublicResults) return inflightPublicResults

  inflightPublicResults = apiFetch<PublicResultsResponse>('/survey/public-results')
    .then((data) => {
      cachedPublicResults = data
      inflightPublicResults = null
      return data
    })
    .catch((err) => {
      inflightPublicResults = null
      throw err
    })

  return inflightPublicResults
}

export async function fetchCachedServices(forceRefresh = false): Promise<Service[]> {
  if (!forceRefresh && cachedServices) return cachedServices
  if (inflightServices) return inflightServices

  inflightServices = apiFetch<ServicesResponse>('/survey/services')
    .then((data) => {
      const list = data?.services || []
      cachedServices = list
      inflightServices = null
      return list
    })
    .catch((err) => {
      inflightServices = null
      throw err
    })

  return inflightServices
}

export async function fetchCachedFormQuestions(forceRefresh = false): Promise<FormQuestionsResponse> {
  if (!forceRefresh && cachedFormQuestions) return cachedFormQuestions
  if (inflightFormQuestions) return inflightFormQuestions

  inflightFormQuestions = apiFetch<FormQuestionsResponse>('/survey/form-questions')
    .then((data) => {
      cachedFormQuestions = data
      inflightFormQuestions = null
      return data
    })
    .catch((err) => {
      inflightFormQuestions = null
      throw err
    })

  return inflightFormQuestions
}

export async function fetchCachedArchiveResults(startDate: string, endDate: string, forceRefresh = false): Promise<ArchiveResultsResponse> {
  const key = `${startDate}_${endDate}`
  if (!forceRefresh && cachedArchiveResults[key]) return cachedArchiveResults[key]
  if (inflightArchiveResults[key]) return inflightArchiveResults[key]!

  inflightArchiveResults[key] = apiFetch<ArchiveResultsResponse>(`/survey/archive-results?start_date=${startDate}&end_date=${endDate}`)
    .then((data) => {
      cachedArchiveResults[key] = data
      inflightArchiveResults[key] = null
      return data
    })
    .catch((err) => {
      inflightArchiveResults[key] = null
      throw err
    })

  return inflightArchiveResults[key]!
}

// Admin Data Fetchers
export async function fetchCachedAdminServices(forceRefresh = false): Promise<Service[]> {
  if (!forceRefresh && cachedAdminServices) return cachedAdminServices
  if (inflightAdminServices) return inflightAdminServices

  inflightAdminServices = apiFetch<Service[]>('/admin/services')
    .then((data) => {
      cachedAdminServices = data || []
      inflightAdminServices = null
      return cachedAdminServices
    })
    .catch((err) => {
      inflightAdminServices = null
      throw err
    })

  return inflightAdminServices
}

export async function fetchCachedAdminUnsur(forceRefresh = false): Promise<Unsur[]> {
  if (!forceRefresh && cachedAdminUnsur) return cachedAdminUnsur
  if (inflightAdminUnsur) return inflightAdminUnsur

  inflightAdminUnsur = apiFetch<Unsur[]>('/admin/unsur')
    .then((data) => {
      cachedAdminUnsur = data || []
      inflightAdminUnsur = null
      return cachedAdminUnsur
    })
    .catch((err) => {
      inflightAdminUnsur = null
      throw err
    })

  return inflightAdminUnsur
}

export async function fetchCachedAdminQuestions(forceRefresh = false): Promise<Question[]> {
  if (!forceRefresh && cachedAdminQuestions) return cachedAdminQuestions
  if (inflightAdminQuestions) return inflightAdminQuestions

  inflightAdminQuestions = apiFetch<Question[]>('/admin/questions')
    .then((data) => {
      cachedAdminQuestions = data || []
      inflightAdminQuestions = null
      return cachedAdminQuestions
    })
    .catch((err) => {
      inflightAdminQuestions = null
      throw err
    })

  return inflightAdminQuestions
}

export async function fetchCachedAdminDemographics(forceRefresh = false): Promise<DemographicField[]> {
  if (!forceRefresh && cachedAdminDemographics) return cachedAdminDemographics
  if (inflightAdminDemographics) return inflightAdminDemographics

  inflightAdminDemographics = apiFetch<DemographicField[]>('/admin/demographics')
    .then((data) => {
      cachedAdminDemographics = data || []
      inflightAdminDemographics = null
      return cachedAdminDemographics
    })
    .catch((err) => {
      inflightAdminDemographics = null
      throw err
    })

  return inflightAdminDemographics
}

export async function fetchCachedAdminPeriods(forceRefresh = false): Promise<SurveyPeriod[]> {
  if (!forceRefresh && cachedAdminPeriods) return cachedAdminPeriods
  if (inflightAdminPeriods) return inflightAdminPeriods

  inflightAdminPeriods = apiFetch<SurveyPeriod[]>('/admin/periods')
    .then((data) => {
      cachedAdminPeriods = data || []
      inflightAdminPeriods = null
      return cachedAdminPeriods
    })
    .catch((err) => {
      inflightAdminPeriods = null
      throw err
    })

  return inflightAdminPeriods
}

export async function fetchCachedAdminStats(forceRefresh = false): Promise<AdminStatsResponse> {
  if (!forceRefresh && cachedAdminStats) return cachedAdminStats
  if (inflightAdminStats) return inflightAdminStats

  inflightAdminStats = apiFetch<AdminStatsResponse>('/admin/stats')
    .then((data) => {
      cachedAdminStats = data || {}
      inflightAdminStats = null
      return cachedAdminStats
    })
    .catch((err) => {
      inflightAdminStats = null
      throw err
    })

  return inflightAdminStats
}

// Prefetch all admin metadata asynchronously for instant tab switching
export function prefetchAllAdminData() {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('token')
  if (!token) return

  // Run in background with staggered timing to avoid database connection jamming
  setTimeout(() => {
    fetchCachedAdminStats().catch(() => {})
  }, 50)

  setTimeout(() => {
    fetchCachedAdminServices().catch(() => {})
  }, 350)

  setTimeout(() => {
    fetchCachedAdminPeriods().catch(() => {})
  }, 650)

  setTimeout(() => {
    fetchCachedAdminUnsur().catch(() => {})
  }, 950)

  setTimeout(() => {
    fetchCachedAdminDemographics().catch(() => {})
  }, 1250)

  setTimeout(() => {
    fetchCachedAdminQuestions().catch(() => {})
  }, 1550)
}

export function invalidateClientCache() {
  cachedPublicResults = null
  cachedServices = null
  cachedFormQuestions = null
  cachedAdminServices = null
  cachedAdminUnsur = null
  cachedAdminQuestions = null
  cachedAdminDemographics = null
  cachedAdminPeriods = null
  cachedAdminStats = null
  for (const k of Object.keys(cachedArchiveResults)) {
    delete cachedArchiveResults[k]
  }
}
