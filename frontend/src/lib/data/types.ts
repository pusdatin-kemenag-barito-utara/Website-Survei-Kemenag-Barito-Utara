import type {
  Service,
  Question,
  DemographicField,
  IndexSummary,
  UnsurSummary,
  IndexByService,
  IndexTrend,
  DemographicSummary,
  SurveyPeriod,
  Response,
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
  ipkp_score?: number | null
  ipak_score?: number | null
}

export interface AdminResponsesFilter {
  page?: number
  limit?: number
  serviceId?: string
  periodId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface AdminResponsesResult {
  data: Response[]
  total: number
  page: number
  limit: number
}

export interface ResponseAnswerDetail {
  id: string
  response_id: string
  question_id: string
  rating_value: number
  question?: Question
  questions?: {
    question_text_id: string
    question_text_en: string
  }
  unsur?: {
    name: string
    index_type: string
  }
}

export interface ResponseDemographicDetail {
  id: string
  response_id: string
  field_id: string
  value: string
  field?: DemographicField
  demographic_fields?: {
    label_id: string
    label_en: string
    field_key: string
  }
}
