import { pb } from '@/lib/pocketbase'
import { apiFetch } from '@/lib/api'
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
import type {
  PublicResultsResponse,
  FormQuestionsResponse,
} from './types'
import { getMutu, getKategoriMutu } from './permenpan'
import {
  cachedPublicResults,
  cachedServices,
  cachedPeriods,
  cachedFormQuestions,
  inflightPublicResults,
  inflightServices,
  inflightPeriods,
  inflightFormQuestions,
  setCachedPublicResults,
  setCachedServices,
  setCachedPeriods,
  setCachedFormQuestions,
  setInflightPublicResults,
  setInflightServices,
  setInflightPeriods,
  setInflightFormQuestions,
  getSession,
  setSession,
} from './cache-store'

export async function fetchPublicResultsFromPocketBase(): Promise<PublicResultsResponse> {
  const [responsesRes, answersRes, unsurRes, servicesRes, periodsRes, demoRes, demoFieldsRes] = await Promise.all([
    pb.collection('responses').getFullList({ sort: '-submitted_at' }),
    pb.collection('response_answers').getFullList({ fields: 'id,response,unsur,rating_value' }),
    pb.collection('unsur').getFullList({ filter: 'is_active = true', sort: 'sort_order' }),
    pb.collection('services').getFullList({ filter: 'is_active = true', sort: 'sort_order' }),
    pb.collection('survey_periods').getFullList({ filter: 'is_active = true', sort: '-start_date' }),
    pb.collection('response_demographics').getFullList({ fields: 'id,response,field,value' }).catch(() => []),
    pb.collection('demographic_fields').getFullList({ filter: 'is_active = true' }).catch(() => []),
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

  // Map Responses to Service ID and dates
  const responseToServiceMap = new Map<string, string>()
  const respDateMap = new Map<string, string>()
  responsesRes.forEach((r: any) => {
    if (r.id && r.service) responseToServiceMap.set(r.id, r.service)
    const rawDate = r.submitted_at || r.created
    if (rawDate && r.id) {
      try {
        const d = new Date(rawDate)
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          respDateMap.set(r.id, `${y}-${m}`)
        }
      } catch {}
    }
  })

  let ipkpSum = 0
  let ipkpCount = 0
  let ipakSum = 0
  let ipakCount = 0

  type TrendKey = string
  const trendGroups = new Map<TrendKey, { sum: number; count: number; bulan: string; index_type: 'IPKP' | 'IPAK' }>()

  answersRes.forEach((a: any) => {
    const unsurId = a.unsur
    const u = unsurId ? unsurMap.get(unsurId) : null
    const val = Number(a.rating_value) || 0
    if (u) {
      if (u.index_type === 'IPAK') {
        ipakSum += val
        ipakCount++
      } else {
        ipkpSum += val
        ipkpCount++
      }
      u.total += val
      u.count++
    }

    const respId = a.response
    const serviceId = respId ? responseToServiceMap.get(respId) : null
    if (serviceId && serviceMap.has(serviceId)) {
      const sItem = serviceMap.get(serviceId)!
      sItem.totalVal += val
      sItem.count++
      if (respId) sItem.responseSet.add(respId)
    }

    // Trend grouping
    const bulan = respId ? respDateMap.get(respId) : null
    if (u && bulan) {
      const tKey = `${bulan}__${u.index_type}`
      if (!trendGroups.has(tKey)) {
        trendGroups.set(tKey, { sum: 0, count: 0, bulan, index_type: u.index_type })
      }
      const tg = trendGroups.get(tKey)!
      tg.sum += val
      tg.count++
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
      nilai_index: Number(avg.toFixed(2)),
      nilai_konversi: konversi,
      score: konversi,
      mutu: getMutu(konversi),
      kategori_mutu: getKategoriMutu(konversi),
      total_nilai: u.total,
      jumlah_responden: totalResponses,
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

  // Demographics aggregation
  const fieldKeyMap = new Map<string, string>()
  demoFieldsRes.forEach((f: any) => {
    if (f.id && f.field_key) fieldKeyMap.set(f.id, f.field_key)
    if (f.original_id && f.field_key) fieldKeyMap.set(f.original_id, f.field_key)
  })

  type DemoKey = string
  const demoCounts = new Map<DemoKey, { service_id: string; service_name: string; field_key: string; demographic_value: string; count: number }>()
  demoRes.forEach((d: any) => {
    const respId = d.response
    const serviceId = respId ? responseToServiceMap.get(respId) : ''
    const sItem = serviceId ? serviceMap.get(serviceId) : null
    const sName = sItem ? sItem.name : ''
    const fieldKey = fieldKeyMap.get(d.field) || ''
    const val = d.value || ''
    if (fieldKey && val) {
      const dKey = `${serviceId || sName}__${fieldKey}__${val}`
      if (!demoCounts.has(dKey)) {
        demoCounts.set(dKey, { service_id: serviceId || '', service_name: sName, field_key: fieldKey, demographic_value: val, count: 0 })
      }
      demoCounts.get(dKey)!.count++
    }
  })
  const demographics: DemographicSummary[] = Array.from(demoCounts.values())

  const trend: IndexTrend[] = Array.from(trendGroups.values())
    .map((g) => ({
      bulan: g.bulan,
      index_type: g.index_type,
      nilai_konversi: g.count > 0 ? Number(((g.sum / g.count) * 25).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.bulan.localeCompare(b.bulan))

  return {
    total_responses: totalResponses,
    ipkp_score: ipkpScore,
    ipak_score: ipakScore,
    ikm_score: ikmScore,
    index_summary: indexSummary,
    unsur_summary: unsurSummary,
    by_service: byService,
    period: activePeriod,
    trend,
    demographics,
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

  const questions = questionsRes.map((q: any) => {
    const rawUnsurId = (typeof q.unsur === 'object' && q.unsur?.id ? q.unsur.id : q.unsur) || q.unsur_id || q.expand?.unsur?.id || ''
    const rawServiceId = (typeof q.service === 'object' && q.service?.id ? q.service.id : q.service) ?? (q.service_id ?? null)
    return {
      ...(q as unknown as Question),
      unsur_id: String(rawUnsurId),
      service_id: rawServiceId ? String(rawServiceId) : null,
      unsur: (q.expand?.unsur as unknown as Unsur) || undefined,
    }
  })

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

export async function fetchCachedPublicResults(forceRefresh = false): Promise<PublicResultsResponse> {
  if (!forceRefresh) {
    if (cachedPublicResults) {
      return cachedPublicResults
    }
    const sess = getSession<PublicResultsResponse>('public_results', 60_000)
    if (sess) {
      setCachedPublicResults(sess)
      return sess
    }
  }
  if (inflightPublicResults) return inflightPublicResults

  const fetchPromise = (async () => {
    // 1. Try Go backend /survey/public-results first (pre-computed, ultra fast ~10ms)
    try {
      const apiP = apiFetch<PublicResultsResponse>('/survey/public-results')
      const timeoutP = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Backend public-results timeout')), 3000)
      )
      const res = await Promise.race([apiP, timeoutP])
      if (res && res.index_summary && res.index_summary.length > 0) {
        setCachedPublicResults(res)
        setSession('public_results', res)
        return res
      }
    } catch (err) {
      console.warn('[DataCache] Backend public results unavailable, falling back to PocketBase:', err)
    }

    // 2. Direct PocketBase aggregation fallback
    try {
      const pbRes = await fetchPublicResultsFromPocketBase()
      setCachedPublicResults(pbRes)
      setSession('public_results', pbRes)
      return pbRes
    } catch (err) {
      console.error('[DataCache] PocketBase fetchPublicResults error:', err)
      throw err
    }
  })().finally(() => {
    setInflightPublicResults(null)
  })

  setInflightPublicResults(fetchPromise)
  return fetchPromise
}

export async function fetchCachedServices(forceRefresh = false): Promise<Service[]> {
  if (!forceRefresh) {
    if (cachedServices) return cachedServices
    const sess = getSession<Service[]>('public_services', 120_000)
    if (sess) {
      setCachedServices(sess)
      return sess
    }
  }
  if (inflightServices) return inflightServices

  const p = (async () => {
    try {
      const res = await apiFetch<{ services?: Service[] } | Service[]>('/survey/services')
      const list = Array.isArray(res) ? res : (res.services || [])
      if (list && list.length > 0) {
        setCachedServices(list)
        setSession('public_services', list)
        return list
      }
    } catch (err) {
      console.warn('[DataCache] Backend services fetch slow or failed, falling back to PocketBase:', err)
    }

    try {
      const list = await fetchServicesFromPocketBase()
      setCachedServices(list)
      setSession('public_services', list)
      return list
    } catch (err) {
      console.error('[DataCache] PocketBase fetchServices error:', err)
      throw err
    }
  })().finally(() => {
    setInflightServices(null)
  })

  setInflightServices(p)
  return p
}

export async function fetchCachedFormQuestions(forceRefresh = false): Promise<FormQuestionsResponse> {
  if (!forceRefresh) {
    if (cachedFormQuestions) return cachedFormQuestions
    const sess = getSession<FormQuestionsResponse>('form_questions')
    if (sess) {
      setCachedFormQuestions(sess)
      return sess
    }
  }
  if (inflightFormQuestions) return inflightFormQuestions

  const p = fetchFormQuestionsFromPocketBase()
    .then((data) => {
      setCachedFormQuestions(data)
      setSession('form_questions', data)
      setInflightFormQuestions(null)
      return data
    })
    .catch((err) => {
      setInflightFormQuestions(null)
      console.error('[DataCache] PocketBase fetchFormQuestions error:', err)
      throw err
    })

  setInflightFormQuestions(p)
  return p
}

export async function fetchCachedPeriods(forceRefresh = false): Promise<SurveyPeriod[]> {
  if (!forceRefresh) {
    if (cachedPeriods) return cachedPeriods
    const sess = getSession<SurveyPeriod[]>('public_periods')
    if (sess) {
      setCachedPeriods(sess)
      return sess
    }
  }
  if (inflightPeriods) return inflightPeriods

  const p = fetchPeriodsFromPocketBase()
    .then((data) => {
      setCachedPeriods(data)
      setSession('public_periods', data)
      setInflightPeriods(null)
      return data
    })
    .catch((err) => {
      setInflightPeriods(null)
      console.error('[DataCache] PocketBase fetchPeriods error:', err)
      throw err
    })

  setInflightPeriods(p)
  return p
}
