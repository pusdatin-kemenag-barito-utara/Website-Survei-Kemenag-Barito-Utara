import { pb } from '@/lib/pocketbase'
import { apiFetch } from '@/lib/api'
import type {
  IndexByService,
  IndexTrend,
  DemographicSummary,
  UnsurSummary,
} from '@/types'
import type { ArchiveResultsResponse } from './types'
import { getMutu, getKategoriMutu } from './permenpan'
import {
  cachedArchiveResults,
  inflightArchiveResults,
  getSession,
  setSession,
} from './cache-store'

export function getArchivePeriodDates(y: string, p: string) {
  let startDate = `${y}-01-01`
  let endDate = `${y}-12-31`

  const lower = p.toLowerCase()
  if (lower === 'q1') {
    startDate = `${y}-01-01`
    endDate = `${y}-03-31`
  } else if (lower === 'q2') {
    startDate = `${y}-04-01`
    endDate = `${y}-06-30`
  } else if (lower === 'q3') {
    startDate = `${y}-07-01`
    endDate = `${y}-09-30`
  } else if (lower === 'q4') {
    startDate = `${y}-10-01`
    endDate = `${y}-12-31`
  } else if (lower === 'sem1' || lower === 's1') {
    startDate = `${y}-01-01`
    endDate = `${y}-06-30`
  } else if (lower === 'sem2' || lower === 's2') {
    startDate = `${y}-07-01`
    endDate = `${y}-12-31`
  }

  return {
    start: `${startDate}T00:00:00`,
    end: `${endDate}T23:59:59`,
    rawStart: startDate,
    rawEnd: endDate,
  }
}

export async function fetchArchiveResultsFromPocketBase(
  startDate: string,
  endDate: string
): Promise<ArchiveResultsResponse> {
  const emptyResult: ArchiveResultsResponse = {
    total_responses: 0,
    ipkp_score: 0,
    ipak_score: 0,
    by_service: [],
    unsur_summary: [],
    demographics: [],
    index_summary: [
      { index_type: 'IPKP', nilai_index: 0, nilai_konversi: 0, mutu: 'D', kinerja: 'Belum Terisi' },
      { index_type: 'IPAK', nilai_index: 0, nilai_konversi: 0, mutu: 'D', kinerja: 'Belum Terisi' },
    ],
    trend: [],
  }

  try {
    const startClean = (startDate || '').slice(0, 10)
    const endClean = (endDate || '').slice(0, 10)

    // 1. Fetch periods and all responses to accurately filter by period relation
    const [periodsRes, responsesAll] = await Promise.all([
      pb.collection('survey_periods').getFullList().catch(() => []),
      pb.collection('responses').getFullList({
        sort: '-submitted_at',
      }),
    ])

    const targetPeriodIds = new Set<string>()
    periodsRes.forEach((p: any) => {
      const pStart = (p.start_date || '').slice(0, 10)
      const pEnd = (p.end_date || '').slice(0, 10)
      if ((!startClean || pStart >= startClean) && (!endClean || pEnd <= endClean)) {
        if (p.id) targetPeriodIds.add(p.id)
        if (p.original_id) targetPeriodIds.add(p.original_id)
      }
    })

    const responsesRes = responsesAll.filter((r: any) => {
      if (r.period && targetPeriodIds.size > 0) {
        return targetPeriodIds.has(r.period)
      }
      const rawDate = r.submitted_at || r.created || ''
      const dateStr = rawDate.slice(0, 10)
      if (startClean && dateStr && dateStr < startClean) return false
      if (endClean && dateStr && dateStr > endClean) return false
      return true
    })

    if (!responsesRes || responsesRes.length === 0) {
      return emptyResult
    }

    const [answersRes, unsurRes, servicesRes, demoRes, demoFieldsRes] = await Promise.all([
      pb.collection('response_answers').getFullList({ fields: 'id,response,unsur,rating_value' }),
      pb.collection('unsur').getFullList({ filter: 'is_active = true', sort: 'sort_order' }),
      pb.collection('services').getFullList({ filter: 'is_active = true', sort: 'sort_order' }),
      pb.collection('response_demographics').getFullList({ fields: 'id,response,field,value' }).catch(() => []),
      pb.collection('demographic_fields').getFullList({ filter: 'is_active = true' }).catch(() => []),
    ])

    const totalResponses = responsesRes.length

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

    const validResponseIds = new Set(responsesRes.map((r: any) => r.id))
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
      if (!a.response || !validResponseIds.has(a.response)) return
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

      const serviceId = responseToServiceMap.get(a.response)
      if (serviceId && serviceMap.has(serviceId)) {
        const sItem = serviceMap.get(serviceId)!
        sItem.totalVal += val
        sItem.count++
        sItem.responseSet.add(a.response)
      }

      const bulan = respDateMap.get(a.response)
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

    const unsurSummary: UnsurSummary[] = Array.from(unsurMap.values()).map((u) => {
      const avg = u.count > 0 ? u.total / u.count : 0
      const divider = u.index_type === 'IPAK' ? 5 : 9
      const nrr = avg / divider
      const score = (avg / 4) * 100
      return {
        unsur_id: u.id,
        unsur_name: u.name,
        index_type: u.index_type,
        nilai_rata_rata_unsur: Number(avg.toFixed(2)),
        nrr_unsur: Number(nrr.toFixed(2)),
        nilai_konversi: Number(score.toFixed(2)),
        kategori_mutu: getKategoriMutu(score),
        jumlah_pertanyaan: 1,
        total_nilai: u.total,
        jumlah_responden: totalResponses,
      }
    })

    const byService: IndexByService[] = []
    serviceMap.forEach((sItem) => {
      const respCount = sItem.responseSet.size
      if (respCount > 0) {
        const avg = sItem.count > 0 ? sItem.totalVal / sItem.count : 0
        const score = (avg / 4) * 100
        byService.push({
          service_id: sItem.id,
          service_name: sItem.name,
          index_type: 'IPKP',
          nilai_index: Number(avg.toFixed(2)),
          nilai_konversi: Number(score.toFixed(2)),
          mutu: getMutu(score),
          kategori_mutu: getKategoriMutu(score),
          jumlah_responden: respCount,
        })
      }
    })

    const ipkpScore = ipkpCount > 0 ? (ipkpSum / ipkpCount / 4) * 100 : 0
    const ipakScore = ipakCount > 0 ? (ipakSum / ipakCount / 4) * 100 : 0

    // Demographics aggregation
    const fieldKeyMap = new Map<string, string>()
    demoFieldsRes.forEach((f: any) => {
      if (f.id && f.field_key) fieldKeyMap.set(f.id, f.field_key)
      if (f.original_id && f.field_key) fieldKeyMap.set(f.original_id, f.field_key)
    })

    type DemoKey = string
    const demoCounts = new Map<DemoKey, { service_id: string; service_name: string; field_key: string; demographic_value: string; count: number }>()
    demoRes.forEach((d: any) => {
      if (!d.response || !validResponseIds.has(d.response)) return
      const serviceId = responseToServiceMap.get(d.response) || ''
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
      ipkp_score: Number(ipkpScore.toFixed(2)),
      ipak_score: Number(ipakScore.toFixed(2)),
      by_service: byService,
      unsur_summary: unsurSummary,
      index_summary: [
        {
          index_type: 'IPKP',
          nilai_index: Number((ipkpScore / 25).toFixed(2)),
          nilai_konversi: Number(ipkpScore.toFixed(2)),
          mutu: getMutu(ipkpScore),
          kinerja: getKategoriMutu(ipkpScore),
        },
        {
          index_type: 'IPAK',
          nilai_index: Number((ipakScore / 25).toFixed(2)),
          nilai_konversi: Number(ipakScore.toFixed(2)),
          mutu: getMutu(ipakScore),
          kinerja: getKategoriMutu(ipakScore),
        },
      ],
      trend,
      demographics,
    }
  } catch (err) {
    console.error('[DataCache] Fallback fetchArchiveResultsFromPocketBase error:', err)
    return emptyResult
  }
}

export async function fetchCachedArchiveResults(
  startDate: string,
  endDate: string,
  forceRefresh = false
): Promise<ArchiveResultsResponse> {
  const key = `${startDate}_${endDate}`
  if (!forceRefresh) {
    if (cachedArchiveResults[key]) {
      return cachedArchiveResults[key]
    }
    const sess = getSession<ArchiveResultsResponse>(`archive_${key}`, 15_000)
    if (sess) {
      cachedArchiveResults[key] = sess
      return sess
    }
  }
  if (inflightArchiveResults[key]) return inflightArchiveResults[key]!

  inflightArchiveResults[key] = (async () => {
    try {
      // 1. Direct fetch from backend Go Fiber (fast, pre-aggregated, ~50ms)
      const data = await apiFetch<ArchiveResultsResponse>(
        `/survey/archive-results?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
      )
      if (data && typeof data.total_responses === 'number') {
        cachedArchiveResults[key] = data
        setSession(`archive_${key}`, data)
        return data
      }
      throw new Error('Invalid archive response format from backend')
    } catch (err) {
      console.warn('[DataCache] Backend archive fetch failed, using PocketBase date-filtered fallback:', err)
      const fallbackData = await fetchArchiveResultsFromPocketBase(startDate, endDate)
      cachedArchiveResults[key] = fallbackData
      setSession(`archive_${key}`, fallbackData)
      return fallbackData
    } finally {
      inflightArchiveResults[key] = null
    }
  })()

  return inflightArchiveResults[key]!
}
