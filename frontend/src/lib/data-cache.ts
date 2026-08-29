import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
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
let cachedPeriods: SurveyPeriod[] | null = null
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
let inflightPeriods: Promise<SurveyPeriod[]> | null = null
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

export function getCachedPeriodsSync(): SurveyPeriod[] | null {
  return cachedPeriods || cachedAdminPeriods
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

// Supabase Direct Fallback Helpers (for high availability / zero downtime)
async function fetchPublicResultsFromSupabaseDirectly(): Promise<PublicResultsResponse> {
  const supabase = createClient()
  if (!supabase) throw new Error('Supabase client unavailable')

  const [viewIndexRes, totalsRes, periodRes] = await Promise.allSettled([
    supabase.from('vw_index_summary').select('*'),
    supabase.from('vw_total_responses').select('total_count'),
    supabase.from('survey_periods').select('*').eq('is_active', true).maybeSingle(),
  ])

  const viewIndex = viewIndexRes.status === 'fulfilled' ? viewIndexRes.value.data : null
  const totalsData = totalsRes.status === 'fulfilled' ? totalsRes.value.data : null
  const activePeriod = periodRes.status === 'fulfilled' ? periodRes.value.data : null

  let totalResponses = 0
  if (Array.isArray(totalsData)) {
    totalResponses = totalsData.reduce((sum: number, row: any) => sum + (Number(row.total_count) || 0), 0)
  }

  let ipkpScore = 0
  let ipakScore = 0
  const indexSummary: IndexSummary[] = []

  if (Array.isArray(viewIndex)) {
    for (const vi of viewIndex) {
      const score = parseFloat(vi.nilai_konversi) || 0
      if (vi.index_type === 'IPAK') {
        ipakScore = score
      } else {
        ipkpScore = score
      }
      indexSummary.push({
        index_type: vi.index_type,
        score: score,
        nilai_konversi: score,
        nilai_index: parseFloat(vi.nilai_index) || 0,
        mutu: vi.mutu,
        kategori_mutu: vi.mutu,
        mutu_pelayanan: vi.kinerja,
        total_responden: totalResponses,
      } as any)
    }
  }

  return {
    total_responses: totalResponses,
    ipkp_score: ipkpScore,
    ipak_score: ipakScore,
    ikm_score: ipkpScore,
    index_summary: indexSummary,
    unsur_summary: [],
    by_service: [],
    trend: [],
    demographics: [],
    period: activePeriod || null,
  } as any
}

async function fetchServicesFromSupabaseDirectly(): Promise<ServicesResponse> {
  const supabase = createClient()
  if (!supabase) throw new Error('Supabase client unavailable')

  const { data, error } = await supabase
    .from('services')
    .select('*, service_categories(*)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return { services: data || [], categories: [] }
}

async function fetchFormQuestionsFromSupabaseDirectly(): Promise<FormQuestionsResponse> {
  const supabase = createClient()
  if (!supabase) throw new Error('Supabase client unavailable')

  const [questionsRes, demoRes] = await Promise.all([
    supabase.from('questions').select('*, unsur(*)').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('demographic_fields').select('*, demographic_options(*)').eq('is_active', true).order('sort_order', { ascending: true }),
  ])

  return {
    questions: questionsRes.data || [],
    demographic_fields: demoRes.data || [],
  }
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
    .catch(async (err) => {
      console.warn('[DataCache] Golang API proxy unreachable, engaging direct Supabase fallback:', err)
      try {
        const directData = await fetchPublicResultsFromSupabaseDirectly()
        cachedPublicResults = directData
        inflightPublicResults = null
        return directData
      } catch (fallbackErr) {
        inflightPublicResults = null
        throw err
      }
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
    .catch(async (err) => {
      console.warn('[DataCache] Golang API services unreachable, engaging direct Supabase fallback:', err)
      try {
        const directData = await fetchServicesFromSupabaseDirectly()
        const list = directData?.services || []
        cachedServices = list
        inflightServices = null
        return list
      } catch (fallbackErr) {
        inflightServices = null
        throw err
      }
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
    .catch(async (err) => {
      console.warn('[DataCache] Golang API form-questions unreachable, engaging direct Supabase fallback:', err)
      try {
        const directData = await fetchFormQuestionsFromSupabaseDirectly()
        cachedFormQuestions = directData
        inflightFormQuestions = null
        return directData
      } catch (fallbackErr) {
        inflightFormQuestions = null
        throw err
      }
    })

  return inflightFormQuestions
}

export async function fetchCachedPeriods(forceRefresh = false): Promise<SurveyPeriod[]> {
  if (!forceRefresh && cachedPeriods) return cachedPeriods
  if (inflightPeriods) return inflightPeriods

  inflightPeriods = apiFetch<SurveyPeriod[]>('/survey/periods')
    .then((data) => {
      cachedPeriods = data || []
      inflightPeriods = null
      return cachedPeriods
    })
    .catch((err) => {
      inflightPeriods = null
      if (cachedAdminPeriods) return cachedAdminPeriods
      throw err
    })

  return inflightPeriods
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

let hasPrefetchedAdmin = false

// Prefetch all admin metadata asynchronously for instant tab switching
export function prefetchAllAdminData() {
  if (typeof window === 'undefined') return
  if (hasPrefetchedAdmin) return
  const token = localStorage.getItem('token')
  if (!token) return

  hasPrefetchedAdmin = true

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
  cachedPeriods = null
  cachedFormQuestions = null
  cachedAdminServices = null
  cachedAdminUnsur = null
  cachedAdminQuestions = null
  cachedAdminDemographics = null
  cachedAdminPeriods = null
  cachedAdminStats = null
  hasPrefetchedAdmin = false
  for (const k of Object.keys(cachedArchiveResults)) {
    delete cachedArchiveResults[k]
  }
}
