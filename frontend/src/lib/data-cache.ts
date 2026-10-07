import { pb } from '@/lib/pocketbase'
import type {
  Service,
  Question,
  DemographicField,
  DemographicOption,
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
  period?: SurveyPeriod | null
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

// Helper Permenpan Mutu
function getMutu(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 88.31) return 'A'
  if (score >= 76.61) return 'B'
  if (score >= 65.0) return 'C'
  return 'D'
}

function getKategoriMutu(score: number): string {
  if (score >= 88.31) return 'Sangat Baik'
  if (score >= 76.61) return 'Baik'
  if (score >= 65.0) return 'Kurang Baik'
  return 'Tidak Baik'
}

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

// ==============================================================================
// PocketBase Direct Fetchers (Single Source of Truth)
// ==============================================================================

export async function fetchPublicResultsFromPocketBase(): Promise<PublicResultsResponse> {
  const [responsesRes, answersRes, unsurRes, servicesRes, periodsRes] = await Promise.all([
    pb.collection('responses').getFullList({ sort: '-submitted_at', expand: 'service,period' }),
    pb.collection('response_answers').getFullList({ expand: 'unsur,question,response' }),
    pb.collection('unsur').getFullList({ filter: 'is_active = true', sort: 'sort_order' }),
    pb.collection('services').getFullList({ filter: 'is_active = true', sort: 'sort_order' }),
    pb.collection('survey_periods').getFullList({ filter: 'is_active = true', sort: '-start_date' }),
  ])

  const totalResponses = responsesRes.length
  const activePeriod = (periodsRes[0] as unknown as SurveyPeriod) || null

  // Map Unsur
  const unsurMap = new Map<string, { id: string; name: string; index_type: 'IPKP' | 'IPAK'; total: number; count: number }>()
  unsurRes.forEach((u: any) => {
    unsurMap.set(u.id, {
      id: u.id,
      name: u.name,
      index_type: u.index_type,
      total: 0,
      count: 0,
    })
  })

  // Map Services
  const serviceMap = new Map<string, { id: string; name: string; totalVal: number; count: number; responseSet: Set<string> }>()
  servicesRes.forEach((s: any) => {
    serviceMap.set(s.id, {
      id: s.id,
      name: s.name,
      totalVal: 0,
      count: 0,
      responseSet: new Set<string>(),
    })
  })

  let ipkpSum = 0
  let ipkpCount = 0
  let ipakSum = 0
  let ipakCount = 0

  answersRes.forEach((a: any) => {
    const u = a.expand?.unsur
    const val = Number(a.rating_value) || 0
    if (u) {
      if (u.index_type === 'IPAK') {
        ipakSum += val
        ipakCount++
      } else {
        ipkpSum += val
        ipkpCount++
      }

      if (unsurMap.has(u.id)) {
        const item = unsurMap.get(u.id)!
        item.total += val
        item.count++
      }
    }

    const resp = a.expand?.response
    const serviceId = resp?.service
    if (serviceId && serviceMap.has(serviceId)) {
      const sItem = serviceMap.get(serviceId)!
      sItem.totalVal += val
      sItem.count++
      if (resp.id) sItem.responseSet.add(resp.id)
    }
  })

  const rawIpkp = ipkpCount > 0 ? (ipkpSum / ipkpCount) * 25 : 0
  const rawIpak = ipakCount > 0 ? (ipakSum / ipakCount) * 25 : 0
  const ipkpScore = Number(rawIpkp.toFixed(2))
  const ipakScore = Number(rawIpak.toFixed(2))
  const ikmScore = ipkpScore

  const indexSummary: IndexSummary[] = [
    {
      index_type: 'IPKP',
      nilai_konversi: ipkpScore,
      score: ipkpScore,
      nilai_index: ipkpCount > 0 ? Number((ipkpSum / ipkpCount).toFixed(2)) : 0,
      mutu: getMutu(ipkpScore),
      kinerja: getKategoriMutu(ipkpScore),
      kategori_mutu: getKategoriMutu(ipkpScore),
      mutu_pelayanan: getKategoriMutu(ipkpScore),
      total_responden: totalResponses,
    },
    {
      index_type: 'IPAK',
      nilai_konversi: ipakScore,
      score: ipakScore,
      nilai_index: ipakCount > 0 ? Number((ipakSum / ipakCount).toFixed(2)) : 0,
      mutu: getMutu(ipakScore),
      kinerja: getKategoriMutu(ipakScore),
      kategori_mutu: getKategoriMutu(ipakScore),
      mutu_pelayanan: getKategoriMutu(ipakScore),
      total_responden: totalResponses,
    },
  ]

  const unsurSummary: UnsurSummary[] = Array.from(unsurMap.values()).map((u) => {
    const avg = u.count > 0 ? u.total / u.count : 0
    const konversi = Number((avg * 25).toFixed(2))
    return {
      unsur_id: u.id,
      unsur_name: u.name,
      index_type: u.index_type,
      total_nilai: u.total,
      jumlah_responden: u.count,
      nilai_rata_rata_unsur: Number(avg.toFixed(2)),
      nilai_konversi: konversi,
      kategori_mutu: getKategoriMutu(konversi),
    }
  })

  const byService: IndexByService[] = Array.from(serviceMap.values())
    .filter((s) => s.responseSet.size > 0)
    .map((s) => {
      const avg = s.count > 0 ? s.totalVal / s.count : 0
      const konversi = Number((avg * 25).toFixed(2))
      return {
        service_id: s.id,
        service_name: s.name,
        index_type: 'IPKP',
        nilai_index: Number(avg.toFixed(2)),
        nilai_konversi: konversi,
        score: konversi,
        mutu: getMutu(konversi),
        kategori_mutu: getKategoriMutu(konversi),
        jumlah_responden: s.responseSet.size,
      }
    })

  return {
    total_responses: totalResponses,
    ipkp_score: ipkpScore,
    ipak_score: ipakScore,
    ikm_score: ikmScore,
    index_summary: indexSummary,
    unsur_summary: unsurSummary,
    by_service: byService,
    period: activePeriod,
    trend: [],
    demographics: [],
  }
}

export async function fetchServicesFromPocketBase(): Promise<Service[]> {
  const records = await pb.collection('services').getFullList({
    filter: 'is_active = true',
    sort: 'sort_order',
  })
  return records as unknown as Service[]
}

export async function fetchFormQuestionsFromPocketBase(): Promise<FormQuestionsResponse> {
  const [questionsRes, fieldsRes, optionsRes] = await Promise.all([
    pb.collection('questions').getFullList({
      filter: 'is_active = true',
      sort: 'sort_order',
      expand: 'unsur',
    }),
    pb.collection('demographic_fields').getFullList({
      filter: 'is_active = true',
      sort: 'sort_order',
    }),
    pb.collection('demographic_options').getFullList({
      sort: 'sort_order',
    }),
  ])

  // Attach options to demographic fields
  const fields = fieldsRes.map((f: any) => {
    const opts = optionsRes
      .filter((o: any) => o.field === f.id)
      .map((o: any) => ({
        id: o.id,
        field_id: f.id,
        value: o.value,
        label_id: o.label_id,
        label_en: o.label_en,
        sort_order: o.sort_order,
      }))
    return {
      ...(f as unknown as DemographicField),
      options: opts as DemographicOption[],
      demographic_options: opts as DemographicOption[],
    }
  })

  const questions = questionsRes.map((q: any) => ({
    ...(q as unknown as Question),
    unsur: (q.expand?.unsur as unknown as Unsur) || undefined,
  }))

  return {
    questions,
    demographic_fields: fields,
  }
}

export async function fetchPeriodsFromPocketBase(): Promise<SurveyPeriod[]> {
  const records = await pb.collection('survey_periods').getFullList({
    sort: '-start_date',
  })
  return records as unknown as SurveyPeriod[]
}

// ==============================================================================
// Cached API Wrappers (PocketBase Direct Integration)
// ==============================================================================

export async function fetchCachedPublicResults(forceRefresh = false): Promise<PublicResultsResponse> {
  if (!forceRefresh && cachedPublicResults) return cachedPublicResults
  if (inflightPublicResults) return inflightPublicResults

  inflightPublicResults = fetchPublicResultsFromPocketBase()
    .then((data) => {
      cachedPublicResults = data
      inflightPublicResults = null
      return data
    })
    .catch((err) => {
      inflightPublicResults = null
      console.error('[DataCache] PocketBase fetchPublicResults error:', err)
      throw err
    })

  return inflightPublicResults
}

export async function fetchCachedServices(forceRefresh = false): Promise<Service[]> {
  if (!forceRefresh && cachedServices) return cachedServices
  if (inflightServices) return inflightServices

  inflightServices = fetchServicesFromPocketBase()
    .then((list) => {
      cachedServices = list
      inflightServices = null
      return list
    })
    .catch((err) => {
      inflightServices = null
      console.error('[DataCache] PocketBase fetchServices error:', err)
      throw err
    })

  return inflightServices
}

export async function fetchCachedFormQuestions(forceRefresh = false): Promise<FormQuestionsResponse> {
  if (!forceRefresh && cachedFormQuestions) return cachedFormQuestions
  if (inflightFormQuestions) return inflightFormQuestions

  inflightFormQuestions = fetchFormQuestionsFromPocketBase()
    .then((data) => {
      cachedFormQuestions = data
      inflightFormQuestions = null
      return data
    })
    .catch((err) => {
      inflightFormQuestions = null
      console.error('[DataCache] PocketBase fetchFormQuestions error:', err)
      throw err
    })

  return inflightFormQuestions
}

export async function fetchCachedPeriods(forceRefresh = false): Promise<SurveyPeriod[]> {
  if (!forceRefresh && cachedPeriods) return cachedPeriods
  if (inflightPeriods) return inflightPeriods

  inflightPeriods = fetchPeriodsFromPocketBase()
    .then((data) => {
      cachedPeriods = data
      inflightPeriods = null
      return data
    })
    .catch((err) => {
      inflightPeriods = null
      console.error('[DataCache] PocketBase fetchPeriods error:', err)
      throw err
    })

  return inflightPeriods
}

export async function fetchCachedArchiveResults(
  startDate: string,
  endDate: string,
  forceRefresh = false
): Promise<ArchiveResultsResponse> {
  const key = `${startDate}_${endDate}`
  if (!forceRefresh && cachedArchiveResults[key]) return cachedArchiveResults[key]
  if (inflightArchiveResults[key]) return inflightArchiveResults[key]!

  inflightArchiveResults[key] = (async () => {
    const res = await fetchPublicResultsFromPocketBase()
    const archiveData: ArchiveResultsResponse = {
      total_responses: res.total_responses || 0,
      ipkp_score: res.ipkp_score || 0,
      ipak_score: res.ipak_score || 0,
      by_service: res.by_service,
      unsur_summary: res.unsur_summary,
      index_summary: res.index_summary,
      trend: [],
      demographics: [],
    }
    cachedArchiveResults[key] = archiveData
    inflightArchiveResults[key] = null
    return archiveData
  })()

  return inflightArchiveResults[key]!
}

// Admin Data Fetchers
export async function fetchCachedAdminServices(forceRefresh = false): Promise<Service[]> {
  if (!forceRefresh && cachedAdminServices) return cachedAdminServices
  if (inflightAdminServices) return inflightAdminServices

  inflightAdminServices = pb
    .collection('services')
    .getFullList({ sort: 'sort_order' })
    .then((data) => {
      const list = data as unknown as Service[]
      cachedAdminServices = list
      inflightAdminServices = null
      return list
    })

  return inflightAdminServices
}

export async function fetchCachedAdminUnsur(forceRefresh = false): Promise<Unsur[]> {
  if (!forceRefresh && cachedAdminUnsur) return cachedAdminUnsur
  if (inflightAdminUnsur) return inflightAdminUnsur

  inflightAdminUnsur = pb
    .collection('unsur')
    .getFullList({ sort: 'sort_order' })
    .then((data) => {
      const list = data as unknown as Unsur[]
      cachedAdminUnsur = list
      inflightAdminUnsur = null
      return list
    })

  return inflightAdminUnsur
}

export async function fetchCachedAdminQuestions(forceRefresh = false): Promise<Question[]> {
  if (!forceRefresh && cachedAdminQuestions) return cachedAdminQuestions
  if (inflightAdminQuestions) return inflightAdminQuestions

  inflightAdminQuestions = pb
    .collection('questions')
    .getFullList({ sort: 'sort_order', expand: 'unsur' })
    .then((data) => {
      const list = data.map((q: any) => ({
        ...(q as unknown as Question),
        unsur: (q.expand?.unsur as unknown as Unsur) || undefined,
      }))
      cachedAdminQuestions = list
      inflightAdminQuestions = null
      return list
    })

  return inflightAdminQuestions
}

export async function fetchCachedAdminDemographics(forceRefresh = false): Promise<DemographicField[]> {
  if (!forceRefresh && cachedAdminDemographics) return cachedAdminDemographics
  if (inflightAdminDemographics) return inflightAdminDemographics

  inflightAdminDemographics = pb
    .collection('demographic_fields')
    .getFullList({ sort: 'sort_order' })
    .then((data) => {
      const list = data as unknown as DemographicField[]
      cachedAdminDemographics = list
      inflightAdminDemographics = null
      return list
    })

  return inflightAdminDemographics
}

export async function fetchCachedAdminPeriods(forceRefresh = false): Promise<SurveyPeriod[]> {
  if (!forceRefresh && cachedAdminPeriods) return cachedAdminPeriods
  if (inflightAdminPeriods) return inflightAdminPeriods

  inflightAdminPeriods = pb
    .collection('survey_periods')
    .getFullList({ sort: '-start_date' })
    .then((data) => {
      const list = data as unknown as SurveyPeriod[]
      cachedAdminPeriods = list
      inflightAdminPeriods = null
      return list
    })

  return inflightAdminPeriods
}

export async function fetchCachedAdminStats(forceRefresh = false): Promise<AdminStatsResponse> {
  if (!forceRefresh && cachedAdminStats) return cachedAdminStats
  if (inflightAdminStats) return inflightAdminStats

  inflightAdminStats = (async () => {
    const [publicRes, servicesList, unsurList, periodsList] = await Promise.all([
      fetchPublicResultsFromPocketBase(),
      pb.collection('services').getFullList({ filter: 'is_active = true' }),
      pb.collection('unsur').getFullList({ filter: 'is_active = true' }),
      pb.collection('survey_periods').getFullList({ filter: 'is_active = true' }),
    ])

    const stats: AdminStatsResponse = {
      total_responses: publicRes.total_responses,
      active_services: servicesList.length,
      total_unsur: unsurList.length,
      active_period: (periodsList[0] as unknown as SurveyPeriod) || null,
      ipkp_score: publicRes.ipkp_score,
      ipak_score: publicRes.ipak_score,
    }
    cachedAdminStats = stats
    inflightAdminStats = null
    return stats
  })()

  return inflightAdminStats
}

let hasPrefetchedAdmin = false

// Prefetch all admin metadata asynchronously for instant tab switching
export function prefetchAllAdminData() {
  if (typeof window === 'undefined') return
  if (hasPrefetchedAdmin) return

  hasPrefetchedAdmin = true

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
