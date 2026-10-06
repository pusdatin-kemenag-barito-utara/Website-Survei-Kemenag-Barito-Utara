import { apiFetch } from '@/lib/api'
import { getPocketBase } from '@/lib/pocketbase/client'
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

// PocketBase Direct Fallback Helpers (for high availability / zero downtime)
async function fetchPublicResultsFromPocketBaseDirectly(): Promise<PublicResultsResponse> {
  const pb = getPocketBase()
  const [totalsRes, periodRes] = await Promise.allSettled([
    pb.collection('responses').getList(1, 1),
    pb.collection('survey_periods').getFirstListItem('is_active = true'),
  ])

  const totalResponses = totalsRes.status === 'fulfilled' ? totalsRes.value.totalItems : 0
  const activePeriod = periodRes.status === 'fulfilled' ? periodRes.value : null

  return {
    total_responses: totalResponses,
    ipkp_score: 0,
    ipak_score: 0,
    ikm_score: 0,
    index_summary: [],
    unsur_summary: [],
    by_service: [],
    trend: [],
    demographics: [],
    period: (activePeriod as any) || null,
  } as any
}

async function fetchServicesFromPocketBaseDirectly(): Promise<ServicesResponse> {
  const pb = getPocketBase()
  const records = await pb.collection('services').getFullList({
    filter: 'is_active = true',
    sort: 'sort_order',
    expand: 'category_id',
  })

  const services = records.map((r: any) => ({
    id: r.original_id || r.id,
    name: r.name,
    category_id: r.expand?.category_id?.original_id || r.category_id,
    slug: r.slug,
    description: r.description,
    is_active: r.is_active,
    sort_order: r.sort_order,
    created_at: r.created,
    service_categories: r.expand?.category_id ? {
      id: r.expand.category_id.original_id || r.expand.category_id.id,
      name: r.expand.category_id.name,
      sort_order: r.expand.category_id.sort_order,
    } : undefined,
  }))

  return { services: services as any, categories: [] }
}

async function fetchFormQuestionsFromPocketBaseDirectly(): Promise<FormQuestionsResponse> {
  const pb = getPocketBase()
  const [questionsRecords, demoFieldsRecords, demoOptionsRecords] = await Promise.all([
    pb.collection('questions').getFullList({
      filter: 'is_active = true',
      sort: 'sort_order',
      expand: 'unsur_id',
    }),
    pb.collection('demographic_fields').getFullList({
      filter: 'is_active = true',
      sort: 'sort_order',
    }),
    pb.collection('demographic_options').getFullList({
      sort: 'sort_order',
    }),
  ])

  const optionsByField = new Map<string, any[]>()
  for (const opt of demoOptionsRecords as any[]) {
    const fId = opt.field || opt.field_id
    if (!optionsByField.has(fId)) {
      optionsByField.set(fId, [])
    }
    optionsByField.get(fId)!.push({
      id: opt.original_id || opt.id,
      field_id: opt.field || opt.field_id,
      label_id: opt.label_id || opt.label || '',
      label_en: opt.label_en || opt.label || '',
      value: opt.value,
      sort_order: opt.sort_order,
    })
  }

  const questions = (questionsRecords as any[]).map((q) => ({
    id: q.original_id || q.id,
    unsur_id: q.expand?.unsur_id?.original_id || q.unsur_id || q.unsur,
    text: q.question_text_id || q.question_text || q.text,
    question_text: q.question_text_id || q.question_text || q.text,
    question_text_id: q.question_text_id || q.question_text || q.text,
    question_text_en: q.question_text_en || q.question_text || q.text,
    service_id: q.service_id || q.service,
    is_active: q.is_active,
    sort_order: q.sort_order,
    unsur: (q.expand?.unsur_id || q.expand?.unsur) ? {
      id: (q.expand?.unsur_id || q.expand?.unsur).original_id || (q.expand?.unsur_id || q.expand?.unsur).id,
      name: (q.expand?.unsur_id || q.expand?.unsur).name,
      index_type: (q.expand?.unsur_id || q.expand?.unsur).index_type,
    } : undefined,
  }))

  const demographic_fields = (demoFieldsRecords as any[]).map((df) => {
    const opts = optionsByField.get(df.id) || optionsByField.get(df.original_id) || []
    return {
      id: df.original_id || df.id,
      field_key: df.field_key,
      label_id: df.label_id || df.label || '',
      label_en: df.label_en || df.label || '',
      field_type: df.field_type,
      is_required: df.is_required,
      is_active: df.is_active,
      sort_order: df.sort_order,
      options: opts,
      demographic_options: opts,
    }
  })

  return {
    questions: questions as any,
    demographic_fields: demographic_fields as any,
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
      console.warn('[DataCache] Golang API proxy unreachable, engaging direct PocketBase fallback:', err)
      try {
        const directData = await fetchPublicResultsFromPocketBaseDirectly()
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
      console.warn('[DataCache] Golang API services unreachable, engaging direct PocketBase fallback:', err)
      try {
        const directData = await fetchServicesFromPocketBaseDirectly()
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
      console.warn('[DataCache] Golang API form-questions unreachable, engaging direct PocketBase fallback:', err)
      try {
        const directData = await fetchFormQuestionsFromPocketBaseDirectly()
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
