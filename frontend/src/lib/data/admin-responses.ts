import { pb } from '@/lib/pocketbase'
import { apiFetch } from '@/lib/api'
import type { Response } from '@/types'
import type {
  AdminResponsesFilter,
  AdminResponsesResult,
  ResponseAnswerDetail,
  ResponseDemographicDetail,
} from './types'
import {
  cachedAdminResponses,
  inflightAdminResponses,
  setCachedAdminResponses,
  setInflightAdminResponses,
  getSession,
  setSession,
} from './cache-store'

// Admin Responses Fetcher with PocketBase Direct Fallback
export async function fetchAdminResponsesWithFallback(
  filter: AdminResponsesFilter = {},
  forceRefresh = false
): Promise<AdminResponsesResult> {
  const isDefaultQuery =
    (!filter.page || filter.page === 1) &&
    (!filter.limit || filter.limit === 10) &&
    !filter.serviceId &&
    !filter.periodId &&
    !filter.dateFrom &&
    !filter.dateTo &&
    !filter.search

  if (!forceRefresh && isDefaultQuery) {
    if (cachedAdminResponses) return cachedAdminResponses
    const sess = getSession<AdminResponsesResult>('admin_responses_default', 15_000)
    if (sess) {
      setCachedAdminResponses(sess)
      return sess
    }
    if (inflightAdminResponses) return inflightAdminResponses
  }

  const doFetch = async (): Promise<AdminResponsesResult> => {
    const queryParams = new URLSearchParams()
    queryParams.set('page', (filter.page || 1).toString())
    queryParams.set('limit', (filter.limit || 10).toString())
    if (filter.serviceId) queryParams.set('service_id', filter.serviceId)
    if (filter.periodId) queryParams.set('period_id', filter.periodId)
    if (filter.dateFrom) queryParams.set('date_from', filter.dateFrom)
    if (filter.dateTo) queryParams.set('date_to', filter.dateTo)
    if (filter.search?.trim()) queryParams.set('search', filter.search.trim())

    // 1. Attempt backend API with snappy 1.2s timeout abort controller
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 1200)

      const res = await apiFetch<AdminResponsesResult>(`/admin/responses?${queryParams.toString()}`, {
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (res && Array.isArray(res.data)) {
        if (isDefaultQuery) {
          setCachedAdminResponses(res)
          setSession('admin_responses_default', res)
        }
        return res
      }
    } catch (err) {
      console.warn('[DataCache] Backend /admin/responses slow or failed, falling back to PocketBase client:', err)
    }

    // 2. PocketBase Direct Query Fallback
    try {
      const pbFilters: string[] = []
      if (filter.serviceId) {
        pbFilters.push(`(service = '${filter.serviceId}' || service.original_id = '${filter.serviceId}')`)
      }
      if (filter.periodId) {
        pbFilters.push(`(period = '${filter.periodId}' || period.original_id = '${filter.periodId}')`)
      }
      if (filter.dateFrom) {
        pbFilters.push(`submitted_at >= '${filter.dateFrom}'`)
      }
      if (filter.dateTo) {
        try {
          const d = new Date(filter.dateTo)
          d.setDate(d.getDate() + 1)
          const nextDay = d.toISOString().split('T')[0]
          pbFilters.push(`submitted_at < '${nextDay}'`)
        } catch {
          pbFilters.push(`submitted_at <= '${filter.dateTo}T23:59:59.999Z'`)
        }
      }
      if (filter.search?.trim()) {
        const cleanSearch = filter.search.trim().replace(/'/g, "\\'")
        pbFilters.push(`(respondent_name ~ '${cleanSearch}' || respondent_contact ~ '${cleanSearch}')`)
      }

      const page = filter.page || 1
      const limit = filter.limit || 10

      const pbList = await pb.collection('responses').getList(page, limit, {
        sort: '-submitted_at',
        expand: 'service,period',
        filter: pbFilters.length > 0 ? pbFilters.join(' && ') : undefined,
        fields: 'id,original_id,service,period,is_anonymous,respondent_name,respondent_contact,locale,turnstile_verified,ip_address,submitted_at,created,expand.service.id,expand.service.name,expand.service.slug,expand.service.original_id,expand.period.id,expand.period.label,expand.period.original_id,expand.period.is_active',
      })

      const mappedResponses: Response[] = pbList.items.map((item: any) => ({
        id: item.original_id || item.id,
        service_id: item.expand?.service?.original_id || item.expand?.service?.id || item.service,
        period_id: item.expand?.period?.original_id || item.expand?.period?.id || item.period,
        is_anonymous: Boolean(item.is_anonymous),
        respondent_name: item.respondent_name || null,
        respondent_contact: item.respondent_contact || null,
        respondent_address: item.respondent_address || null,
        locale: item.locale || 'id',
        turnstile_verified: Boolean(item.turnstile_verified),
        ip_address: item.ip_address || '',
        submitted_at: item.submitted_at || item.created,
        ipkp_feedback: item.ipkp_feedback || '',
        ipak_feedback: item.ipak_feedback || '',
        service: item.expand?.service
          ? {
              id: item.expand.service.original_id || item.expand.service.id,
              name: item.expand.service.name,
              slug: item.expand.service.slug,
              description: item.expand.service.description,
              is_active: item.expand.service.is_active,
              sort_order: item.expand.service.sort_order,
              created_at: item.expand.service.created,
              updated_at: item.expand.service.updated,
            }
          : undefined,
        period: item.expand?.period
          ? {
              id: item.expand.period.original_id || item.expand.period.id,
              label: item.expand.period.label,
              period_type: item.expand.period.period_type,
              start_date: item.expand.period.start_date,
              end_date: item.expand.period.end_date,
              is_active: item.expand.period.is_active,
              created_at: item.expand.period.created,
            }
          : undefined,
      }))

      const fallbackResult: AdminResponsesResult = {
        data: mappedResponses,
        total: pbList.totalItems,
        page: pbList.page,
        limit: pbList.perPage,
      }

      if (isDefaultQuery) {
        setCachedAdminResponses(fallbackResult)
        setSession('admin_responses_default', fallbackResult)
      }

      return fallbackResult
    } catch (pbErr) {
      console.error('[DataCache] Both backend and PocketBase direct responses fetch failed:', pbErr)
      throw pbErr
    }
  }

  if (isDefaultQuery) {
    const inflight = doFetch().finally(() => {
      setInflightAdminResponses(null)
    })
    setInflightAdminResponses(inflight)
    return inflight
  }

  return doFetch()
}

// Response Detail with PocketBase Direct Fallback
export async function fetchResponseDetailWithFallback(responseId: string): Promise<{
  answers: ResponseAnswerDetail[]
  demographics: ResponseDemographicDetail[]
}> {
  try {
    const [ansData, demoData] = await Promise.all([
      apiFetch<ResponseAnswerDetail[]>(`/admin/responses/${responseId}/answers`).catch(() => null),
      apiFetch<ResponseDemographicDetail[]>(`/admin/responses/${responseId}/demographics`).catch(() => null),
    ])

    if (ansData && ansData.length > 0) {
      return {
        answers: ansData,
        demographics: demoData || [],
      }
    }
  } catch {}

  // Direct PocketBase Fallback for Answers & Demographics
  try {
    const [ansPb, demoPb] = await Promise.all([
      pb.collection('response_answers').getList(1, 100, {
        filter: `response = '${responseId}' || response.original_id = '${responseId}'`,
        expand: 'question,unsur',
      }),
      pb.collection('response_demographics').getList(1, 100, {
        filter: `response = '${responseId}' || response.original_id = '${responseId}'`,
        expand: 'field',
      }),
    ])

    const answers: ResponseAnswerDetail[] = ansPb.items.map((item: any) => ({
      id: item.original_id || item.id,
      response_id: responseId,
      question_id: item.expand?.question?.original_id || item.expand?.question?.id || item.question,
      rating_value: Number(item.rating_value) || 0,
      questions: {
        question_text_id: item.expand?.question?.question_text_id || '',
        question_text_en: item.expand?.question?.question_text_en || '',
      },
      unsur: {
        name: item.expand?.unsur?.name || '',
        index_type: item.expand?.unsur?.index_type || 'IPKP',
      },
    }))

    const demographics: ResponseDemographicDetail[] = demoPb.items.map((item: any) => ({
      id: item.original_id || item.id,
      response_id: responseId,
      field_id: item.expand?.field?.original_id || item.expand?.field?.id || item.field,
      value: item.value || '-',
      demographic_fields: {
        label_id: item.expand?.field?.label_id || '',
        label_en: item.expand?.field?.label_en || '',
        field_key: item.expand?.field?.field_key || '',
      },
    }))

    return { answers, demographics }
  } catch (err) {
    console.error('[DataCache] Failed to load response detail from PocketBase fallback:', err)
    return { answers: [], demographics: [] }
  }
}
