
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Send, Loader2, Info, User, Phone, ListTodo, ShieldAlert, FileText, Building2, Check, ShieldCheck, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/components/shared/I18nProvider'
import { StarRating } from '@/components/public/StarRating'
import { SurveyThankYou } from '@/components/public/SurveyThankYou'
import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'
import { apiFetch } from '@/lib/api'
import { pb } from '@/lib/pocketbase'
import {
  fetchCachedServices,
  fetchCachedFormQuestions,
  fetchCachedActivePeriod,
  getCachedServicesSync,
  getCachedFormQuestionsSync,
  getCachedActivePeriodSync,
  invalidateClientCache,
} from '@/lib/data-cache'
import { Analytics } from '@/lib/analytics'
import { toast } from 'sonner'
import type { Service, Question, UnsurWithQuestions, DemographicField, SurveyPeriod } from '@/types'

function mapQuestionsToUnsur(questions: Question[]): { ipkp: UnsurWithQuestions[], ipak: UnsurWithQuestions[] } {
  const ipkpMap: Record<string, UnsurWithQuestions> = {}
  const ipakMap: Record<string, UnsurWithQuestions> = {}

  questions.forEach((q: Question) => {
    if (q.unsur) {
      const u = q.unsur
      const targetMap = u.index_type === 'IPAK' ? ipakMap : ipkpMap
      if (!targetMap[u.id]) {
        targetMap[u.id] = { ...u, questions: [] }
      }
      targetMap[u.id].questions.push(q)
    }
  })

  // Sort questions within each unsur by sort_order
  Object.values(ipkpMap).forEach(u => u.questions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
  Object.values(ipakMap).forEach(u => u.questions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))

  return {
    ipkp: Object.values(ipkpMap).filter(u => u.questions.length > 0).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    ipak: Object.values(ipakMap).filter(u => u.questions.length > 0).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }
}

function getServiceCategory(service: Service): string {
  if (service.description && service.description.trim().length > 0) {
    return service.description.trim()
  }
  const lower = service.name.toLowerCase()
  if (lower.includes('pensiun') || lower.includes('pangkat') || lower.includes('mutasi') || lower.includes('kepegawaian') || lower.includes('cuti') || lower.includes('kgb')) {
    return 'Layanan Kepegawaian & SDM'
  }
  if (lower.includes('haji') || lower.includes('umrah') || lower.includes('paspor')) {
    return 'Layanan Penyelenggaraan Haji & Umrah'
  }
  if (lower.includes('emis') || lower.includes('ijazah') || lower.includes('siswa') || lower.includes('madrasah') || lower.includes('ijin operasional') || lower.includes('tpq') || lower.includes('pesantren')) {
    return 'Layanan Pendidikan Agama & Keagamaan'
  }
  if (lower.includes('gereja') || lower.includes('rohaniwan') || lower.includes('kua') || lower.includes('nikah') || lower.includes('masjid') || lower.includes('rumah ibadah') || lower.includes('zakat') || lower.includes('wakaf')) {
    return 'Layanan Bimbingan & Urusan Keagamaan'
  }
  return 'Layanan Tata Usaha'
}

const formSchema = z.object({
  service_id: z.string().min(1, { message: 'survey.select_service_error' }),
  is_anonymous: z.boolean(),
  respondent_name: z.string().optional(),
  respondent_contact: z.string().optional(),
  respondent_address: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.is_anonymous) {
    if (!data.respondent_name || data.respondent_name.trim().length === 0 || !/^[a-zA-Z\s.,'-]+$/.test(data.respondent_name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['respondent_name'],
        message: 'Nama wajib diisi dengan huruf dan tanda baca umum',
      })
    }
    if (!data.respondent_contact || !/^[0-9]{10,13}$/.test(data.respondent_contact)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['respondent_contact'],
        message: 'Kontak wajib 10-13 digit angka',
      })
    }
  }
})

type FormValues = z.infer<typeof formSchema>

export default function SurveiPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(true)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent background scrolling and trap focus/interaction while disclaimer modal is open
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (disclaimerOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalHtmlOverflow = document.documentElement.style.overflow
      const originalBodyPaddingRight = document.body.style.paddingRight
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent Esc key from closing dialog without user explicit decision
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      window.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
        document.body.style.paddingRight = originalBodyPaddingRight
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [disclaimerOpen])

  const initServices = getCachedServicesSync()
  const initForm = getCachedFormQuestionsSync()
  const initActivePeriod = getCachedActivePeriodSync()

  const [services, setServices] = useState<Service[]>(initServices || [])
  const [allQuestions, setAllQuestions] = useState<Question[]>(initForm?.questions || [])
  const [demographicFields, setDemographicFields] = useState<DemographicField[]>(initForm?.demographic_fields || [])
  const [activePeriod, setActivePeriod] = useState<SurveyPeriod | null>(initActivePeriod || null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(!initServices || !initForm)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [demographics, setDemographics] = useState<Record<string, string>>({})
  const [ipkpFeedback, setIpkpFeedback] = useState('')
  const [ipakFeedback, setIpakFeedback] = useState('')

  const { control, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { service_id: '', is_anonymous: false, respondent_name: '', respondent_contact: '', respondent_address: '' },
  })

  const isAnonymous = useWatch({ control, name: 'is_anonymous' })
  const selectedServiceId = useWatch({ control, name: 'service_id' })
  const respondentName = useWatch({ control, name: 'respondent_name' }) || ''
  const respondentContact = useWatch({ control, name: 'respondent_contact' }) || ''

  // Filter questions dynamically based on selectedServiceId
  const { ipkp: ipkpUnsur, ipak: ipakUnsur } = useMemo(() => {
    const filtered = allQuestions.filter((q) => {
      if (q.is_active === false) return false
      // General questions (no service_id, empty string, or 'ALL')
      if (!q.service_id || q.service_id === '' || q.service_id === 'ALL') return true
      // Specific service questions
      return selectedServiceId ? q.service_id === selectedServiceId : false
    })
    return mapQuestionsToUnsur(filtered)
  }, [allQuestions, selectedServiceId])

  useEffect(() => {
    async function fetchData() {
      try {
        const [servicesList, formData, activePeriodData] = await Promise.all([
          fetchCachedServices(),
          fetchCachedFormQuestions(true),
          fetchCachedActivePeriod(),
        ])

        if (servicesList) {
          setServices(servicesList)
        }

        if (formData) {
          setDemographicFields(formData.demographic_fields || [])
          setAllQuestions(formData.questions || [])
        }

        if (activePeriodData) {
          setActivePeriod(activePeriodData)
        }

        // Set default service if query param exists
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const sid = params.get('service')
          const foundService = sid && servicesList ? servicesList.find((x) => x.slug === sid) : null
          if (foundService) {
            setValue('service_id', foundService.id)
          }
        }
      } catch (err) {
        console.error("Error fetching survey data from Go API:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [setValue])

  // Draft Auto-Recovery: Restore respondent progress if browser reloaded or accidentally closed
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const rawDraft = sessionStorage.getItem('si_arus_survey_draft')
      if (rawDraft) {
        const draft = JSON.parse(rawDraft)
        const ageHours = (Date.now() - (draft.timestamp || 0)) / (1000 * 60 * 60)
        if (ageHours < 4) {
          if (draft.answers && Object.keys(draft.answers).length > 0) setAnswers(draft.answers)
          if (draft.demographics && Object.keys(draft.demographics).length > 0) setDemographics(draft.demographics)
          if (draft.ipkpFeedback) setIpkpFeedback(draft.ipkpFeedback)
          if (draft.ipakFeedback) setIpakFeedback(draft.ipakFeedback)
          if (draft.service_id) setValue('service_id', draft.service_id)
          if (typeof draft.is_anonymous === 'boolean') setValue('is_anonymous', draft.is_anonymous)
          if (draft.respondent_name) setValue('respondent_name', draft.respondent_name)
          if (draft.respondent_contact) setValue('respondent_contact', draft.respondent_contact)
          if (typeof draft.step === 'number' && draft.step > 0) {
            setStep(draft.step)
            setDisclaimerOpen(false)
          }
        } else {
          sessionStorage.removeItem('si_arus_survey_draft')
        }
      }
    } catch {}
  }, [setValue])

  // Draft Auto-Save: Persist progress in sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined' || submitted) return
    const hasData = Object.keys(answers).length > 0 || Object.keys(demographics).length > 0 || ipkpFeedback || ipakFeedback || step > 0
    if (hasData) {
      try {
        const draft = {
          answers,
          demographics,
          ipkpFeedback,
          ipakFeedback,
          step,
          service_id: selectedServiceId,
          is_anonymous: isAnonymous,
          respondent_name: respondentName,
          respondent_contact: respondentContact,
          timestamp: Date.now(),
        }
        sessionStorage.setItem('si_arus_survey_draft', JSON.stringify(draft))
      } catch {}
    }
  }, [answers, demographics, ipkpFeedback, ipakFeedback, step, selectedServiceId, isAnonymous, respondentName, respondentContact, submitted])

  // Instant Realtime Synchronization with Admin Modifications
  useEffect(() => {
    const syncAll = () => {
      invalidateClientCache()
      fetchCachedFormQuestions(true).then((formData) => {
        if (formData?.questions) {
          setAllQuestions(formData.questions)
        }
        if (formData?.demographic_fields) {
          setDemographicFields(formData.demographic_fields)
        }
      }).catch((err) => {
        console.error('[SurveiPage] Realtime sync error:', err)
      })

      fetchCachedActivePeriod(true).then((periodData) => {
        if (periodData) {
          setActivePeriod(periodData)
        }
      }).catch((err) => {
        console.error('[SurveiPage] Period sync error:', err)
      })
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'si_arus_data_updated' || e.key === 'si_arus_questions_updated') {
        syncAll()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('si-arus-data-changed', syncAll)

    let unsubscribePbQuestions: (() => void) | undefined
    let unsubscribePbPeriods: (() => void) | undefined

    try {
      pb.collection('questions').subscribe('*', () => {
        syncAll()
      }).then((unsub) => {
        unsubscribePbQuestions = unsub
      }).catch(() => {})
    } catch {}

    try {
      pb.collection('survey_periods').subscribe('*', () => {
        syncAll()
      }).then((unsub) => {
        unsubscribePbPeriods = unsub
      }).catch(() => {})
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('si-arus-data-changed', syncAll)
      if (unsubscribePbQuestions) {
        try { unsubscribePbQuestions() } catch {}
      } else {
        try { pb.collection('questions').unsubscribe('*').catch(() => {}) } catch {}
      }
      if (unsubscribePbPeriods) {
        try { unsubscribePbPeriods() } catch {}
      } else {
        try { pb.collection('survey_periods').unsubscribe('*').catch(() => {}) } catch {}
      }
    }
  }, [])

  const totalSteps = 5

  function goToStep(next: number) {
    setDirection(next > step ? 1 : -1)
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  const canProceed = useCallback(() => {
    if (step === 0) {
      if (!selectedServiceId) return false
      if (isAnonymous) return true
      if (!respondentName || !respondentContact) return false
      if (!/^[a-zA-Z\s.,'-]+$/.test(respondentName)) return false
      if (!/^[0-9]{10,13}$/.test(respondentContact)) return false
      return true
    }
    if (step === 1) {
      const requiredFields = demographicFields.filter(f => f.is_required)
      const isRequiredValid = requiredFields.every(f => !!demographics[f.id])
      if (!isRequiredValid) return false

      // Check toggle fields (disabilitas)
      for (const field of demographicFields) {
        if (field.field_type === 'toggle') {
          const val = demographics[field.id] || ''
          if (val.startsWith('Ya')) {
            const opts = field.options || field.demographic_options
            if (opts && opts.length > 0) {
              if (!val.includes('(') || !val.includes(')')) {
                return false
              }
            }
          }
        }
      }

      return true
    }
    if (step === 2) {
      const ipkpQuestions = ipkpUnsur.flatMap((u) => u.questions)
      return ipkpQuestions.every((q) => answers[q.id] && answers[q.id] > 0)
    }
    if (step === 3) {
      const ipakQuestions = ipakUnsur.flatMap((u) => u.questions)
      return ipakQuestions.every((q) => answers[q.id] && answers[q.id] > 0)
    }
    if (step === 4) return true
    return true
  }, [step, selectedServiceId, isAnonymous, respondentName, respondentContact, answers, demographics, demographicFields, ipkpUnsur, ipakUnsur])

  function canStepProceed(s: number): boolean {
    if (s === 0) {
      if (!selectedServiceId) return false
      if (isAnonymous) return true
      if (!respondentName || !respondentContact) return false
      if (!/^[a-zA-Z\s.,'-]+$/.test(respondentName)) return false
      if (!/^[0-9]{10,13}$/.test(respondentContact)) return false
      return true
    }
    if (s === 1) {
      const required = demographicFields.filter(f => f.is_required)
      const isRequiredValid = required.every(f => !!demographics[f.id])
      if (!isRequiredValid) return false

      for (const field of demographicFields) {
        if (field.field_type === 'toggle') {
          const val = demographics[field.id] || ''
          if (val.startsWith('Ya')) {
            const opts = field.options || field.demographic_options
            if (opts && opts.length > 0) {
              if (!val.includes('(') || !val.includes(')')) {
                return false
              }
            }
          }
        }
      }

      return true
    }
    if (s === 2) {
      const qs = ipkpUnsur.flatMap(u => u.questions)
      return qs.every(q => answers[q.id] && answers[q.id] > 0)
    }
    if (s === 3) {
      const qs = ipakUnsur.flatMap(u => u.questions)
      return qs.every(q => answers[q.id] && answers[q.id] > 0)
    }
    if (s === 4) return true
    return true
  }

  const formatPeriodLabel = (label: string, isEn: boolean): string => {
    if (!label) return ''
    if (!isEn) return label

    return label
      .replace(/Triwulan\s*I\b/gi, 'Quarter 1')
      .replace(/Triwulan\s*II\b/gi, 'Quarter 2')
      .replace(/Triwulan\s*III\b/gi, 'Quarter 3')
      .replace(/Triwulan\s*IV\b/gi, 'Quarter 4')
      .replace(/Triwulan\s*1\b/gi, 'Quarter 1')
      .replace(/Triwulan\s*2\b/gi, 'Quarter 2')
      .replace(/Triwulan\s*3\b/gi, 'Quarter 3')
      .replace(/Triwulan\s*4\b/gi, 'Quarter 4')
      .replace(/Semester\s*I\b/gi, 'Semester 1')
      .replace(/Semester\s*II\b/gi, 'Semester 2')
      .replace(/Semester\s*1\b/gi, 'Semester 1')
      .replace(/Semester\s*2\b/gi, 'Semester 2')
      .replace(/Tahunan\b/gi, 'Annual')
      .replace(/\bTahun\b/gi, 'Year')
  }

  const getCurrentPeriodText = () => {
    const isEn = locale === 'en'

    // Gunakan periode aktif dari panel admin jika ada
    if (activePeriod?.label) {
      return formatPeriodLabel(activePeriod.label, isEn)
    }

    // Fallback: estimasi berdasarkan tanggal kalender jika belum ter-load
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    let triwulan = ''
    if (month >= 1 && month <= 3) triwulan = isEn ? 'Quarter 1' : 'Triwulan I'
    else if (month >= 4 && month <= 6) triwulan = isEn ? 'Quarter 2' : 'Triwulan II'
    else if (month >= 7 && month <= 9) triwulan = isEn ? 'Quarter 3' : 'Triwulan III'
    else triwulan = isEn ? 'Quarter 4' : 'Triwulan IV'
    
    return isEn ? `${triwulan} Year ${year}` : `${triwulan} Tahun ${year}`
  }

  async function onSubmit(formData: FormValues) {
    if (submitting || submitted) return
    setSubmitting(true)
    try {
      const validFieldIds = new Set(demographicFields.map((f) => f.id))
      const demoObj: Record<string, string> = {}
      Object.entries(demographics).forEach(([field_id, value]) => {
        if (validFieldIds.has(field_id) && value) {
          demoObj[field_id] = String(value).trim()
        }
      })
      // Ensure toggle fields (e.g. disabilitas) record 'Tidak' if unselected
      demographicFields.forEach((f) => {
        if (f.field_type === 'toggle' && !demoObj[f.id]) {
          demoObj[f.id] = 'Tidak'
        }
      })

      const answerObj: Record<string, number> = {}
      Object.entries(answers).forEach(([qId, val]) => {
        if (qId && val > 0) {
          answerObj[qId] = val
        }
      })

      const isAnon = Boolean(formData.is_anonymous)

      const payload = {
        service_id: formData.service_id,
        is_anonymous: isAnon,
        respondent_name: isAnon ? 'Anonim' : (formData.respondent_name?.trim() || 'Responden'),
        respondent_contact: isAnon ? '-' : (formData.respondent_contact?.trim() || '-'),
        ipkp_feedback: ipkpFeedback.trim(),
        ipak_feedback: ipakFeedback.trim(),
        locale,
        demographics: demoObj,
        answers: answerObj
      }

      await apiFetch('/survey/submit', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      Analytics.surveySubmit(payload.service_id)
      invalidateClientCache()
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('si_arus_survey_draft')
      }
      setSubmitted(true)
      toast.success(t('survey.success_submit'))
    } catch (err: unknown) {
      console.error('[onSubmit] Go API submission error:', err)
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
      if (isOffline) {
        toast.error(locale === 'en' 
          ? 'Internet connection lost. Your survey data is safely stored in this browser. Please reconnect and submit again.' 
          : 'Koneksi internet terputus. Data jawaban Anda tetap tersimpan aman di browser ini. Silakan hubungkan kembali internet lalu klik Kirim Survei.')
      } else {
        toast.error(t('survey.error_submit'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const autoScrollToNextQuestion = useCallback((currentQuestionId: string) => {
    if (typeof window === 'undefined') return

    // Fitur auto-scroll khusus untuk halaman lembar kuesioner IPKP (step 2) & IPAK (step 3)
    if (step !== 2 && step !== 3) return

    const currentUnsurList = step === 2 ? ipkpUnsur : ipakUnsur
    if (!currentUnsurList || currentUnsurList.length === 0) return

    // Susun daftar pertanyaan secara berurutan beserta status apakah awal unsur baru
    const flatQuestions: { questionId: string; unsurId: string; isFirstInUnsur: boolean }[] = []
    currentUnsurList.forEach((unsur) => {
      unsur.questions.forEach((q, qIdx) => {
        flatQuestions.push({
          questionId: q.id,
          unsurId: unsur.id,
          isFirstInUnsur: qIdx === 0,
        })
      })
    })

    const currentIndex = flatQuestions.findIndex((item) => item.questionId === currentQuestionId)
    if (currentIndex === -1) return

    // Jeda 200ms agar responden sempat melihat feedback visual highlight/warna pilihan emotikon
    setTimeout(() => {
      let targetElement: HTMLElement | null = null

      if (currentIndex < flatQuestions.length - 1) {
        const nextItem = flatQuestions[currentIndex + 1]
        // Jika pertanyaan berikutnya adalah nomor 1 di kategori unsur baru, scroll ke judul unsur agar jelas
        if (nextItem.isFirstInUnsur) {
          targetElement = document.getElementById(`unsur-block-${nextItem.unsurId}`)
        }
        if (!targetElement) {
          targetElement = document.getElementById(`question-card-${nextItem.questionId}`)
        }
      } else {
        // Jika sudah pertanyaan terakhir di lembar ini, scroll ke bagian saran/masukan atau tombol navigasi
        const feedbackId = step === 2 ? 'ipkp-feedback-section' : 'ipak-feedback-section'
        targetElement = document.getElementById(feedbackId) || document.getElementById('survey-step-actions')
      }

      if (targetElement) {
        const navbarHeight = window.innerWidth < 640 ? 72 : 84
        const rect = targetElement.getBoundingClientRect()
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
        const targetTop = scrollTop + rect.top - navbarHeight - 12

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        })
      }
    }, 200)
  }, [step, ipkpUnsur, ipakUnsur])

  function handleAnswerChange(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    autoScrollToNextQuestion(questionId)
  }

  function handleDemographicChange(fieldId: string, value: string) {
    setDemographics((prev) => ({ ...prev, [fieldId]: value }))
  }

  if (submitted) {
    return (
      <SurveyThankYou
        serviceName={services.find((s) => s.id === selectedServiceId)?.name}
        onReset={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('si_arus_survey_draft')
          }
          setSubmitted(false)
          setStep(0)
          reset({
            service_id: '',
            is_anonymous: false,
            respondent_name: '',
            respondent_contact: '',
            respondent_address: '',
          })
          setAnswers({})
          setDemographics({})
          setIpkpFeedback('')
          setIpakFeedback('')
          setDisclaimerOpen(false)
          window.scrollTo({ top: 0, behavior: 'instant' })
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <>
      <PublicNavbar />
      <main className="flex-1 bg-slate-50/70 dark:bg-gray-950 pb-6">
        <div className="w-full px-1.5 sm:px-8 lg:px-16 xl:px-20 py-4 sm:py-8">
          
          {/* Header Banner Card */}
          <div className="mb-6 sm:mb-8 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl p-4 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-black/20">
            <div className="flex flex-row items-center gap-3 sm:gap-4 border-b border-slate-100 dark:border-gray-800 pb-4 mb-4 sm:pb-6 sm:mb-6">
              <div className="flex size-10 sm:size-14 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                <ListTodo className="size-5 sm:size-7" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {locale === 'en' ? 'IPKP & IPAK Index Survey Questionnaire' : 'Kuesioner Survei Indeks IPKP & IPAK'}
                </h1>
                <p className="text-[11px] sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
                  {getCurrentPeriodText()} • {locale === 'en' ? 'Ministry of Religious Affairs of Barito Utara Regency' : 'Kantor Kementerian Agama Kabupaten Barito Utara'}
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl p-4 sm:p-5 text-emerald-950 dark:text-emerald-200 flex items-start gap-3.5">
              <Info className="size-5 sm:size-6 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {locale === 'en' ? (
                  <>Please complete all fields in the form below by providing an objective assessment of the services you received at <strong>THE MINISTRY OF RELIGIOUS AFFAIRS OF BARITO UTARA REGENCY</strong>.</>
                ) : (
                  <>Silakan lengkapi seluruh isian formulir di bawah ini dengan memberikan penilaian objektif mengenai pelayanan yang Anda terima pada <strong>KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA</strong>.</>
                )}
              </p>
            </div>
          </div>
          
          {/* Step Progress Tracker */}
          <div className="mb-6 sm:mb-8 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 p-3 sm:p-6 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {Array.from({ length: totalSteps }, (_, i) => {
                const isCompleted = canStepProceed(i)
                const isReachable = i <= step || Array.from({ length: i }, (_, j) => j).every(j => canStepProceed(j))
                const stepNames = locale === 'en'
                  ? ['Identity', 'Demographics', 'IPKP', 'IPAK', 'Submit']
                  : ['Identitas', 'Demografi', 'IPKP', 'IPAK', 'Kirim']

                return (
                  <div key={i} className="flex items-center gap-1 sm:gap-3 flex-1 justify-center min-w-0">
                    <button
                      type="button"
                      onClick={() => isReachable && goToStep(i)}
                      className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                        !isReachable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                      disabled={!isReachable}
                      title={!isReachable ? 'Selesaikan langkah sebelumnya terlebih dahulu' : ''}
                    >
                      <div className={`flex size-7.5 sm:size-10 items-center justify-center rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-black transition-all duration-200 ${
                        i === step
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 sm:ring-4 ring-emerald-100 dark:ring-emerald-950 scale-105'
                          : i < step && isCompleted
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : isReachable
                          ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-400'
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-[9px] sm:text-xs font-bold tracking-tight text-center truncate max-w-[55px] sm:max-w-none ${
                        i === step ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
                      }`}>
                        {stepNames[i]}
                      </span>
                    </button>

                    {i < totalSteps - 1 && (
                      <div className={`h-1 flex-1 rounded-full transition-colors hidden sm:block ${
                        i < step ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-gray-800'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

      <form 
        onSubmit={(e) => e.preventDefault()} 
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
          }
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {step === 0 && (
              <Card className="border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-6">
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="size-5 text-emerald-600" />
                    <span>{locale === 'en' ? 'Select Service Type & Respondent Identity' : 'Pilihan Jenis Layanan & Identitas Responden'}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === 'en' ? 'Select Service Type Received' : 'Pilih Jenis Layanan yang Diterima'} <span className="text-rose-500">*</span>
                    </Label>
                    <Controller
                      name="service_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={(v) => v !== null && field.onChange(v)}>
                          <SelectTrigger className="w-full rounded-2xl border-slate-200 dark:border-gray-800 py-6 text-xs sm:text-sm font-semibold shadow-xs">
                            <SelectValue placeholder={t('survey.select_service_placeholder')}>
                              {field.value ? (
                                <span className="flex items-center gap-2 text-emerald-950 dark:text-emerald-300 font-bold">
                                  <FileText className="size-4 text-emerald-600 shrink-0" />
                                  <span className="truncate">{services.find((s) => s.id === field.value)?.name}</span>
                                </span>
                              ) : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[420px] rounded-2xl p-2 shadow-2xl border-slate-200">
                            {(() => {
                              const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
                                const cat = getServiceCategory(s)
                                if (!acc[cat]) acc[cat] = []
                                acc[cat].push(s)
                                return acc
                              }, {})

                              return Object.entries(grouped).map(([category, items]) => (
                                <SelectGroup key={category} className="mb-2.5 last:mb-0">
                                  <SelectLabel className="px-3 py-1.5 text-[11px] font-black tracking-wider uppercase text-emerald-800 bg-emerald-100/70 dark:bg-emerald-950/70 rounded-xl mb-1 flex items-center gap-1.5">
                                    <Building2 className="size-3.5 text-emerald-600" />
                                    <span>{category}</span>
                                  </SelectLabel>
                                  {items.map((s, idx) => (
                                    <SelectItem key={s.id} value={s.id} className="rounded-xl py-2 cursor-pointer my-0.5">
                                      <div className="flex items-center gap-2.5 w-full pl-1">
                                        <span className="flex size-5 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black shrink-0 border border-emerald-200/80">
                                          {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm">{s.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))
                            })()}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.service_id && (
                      <p className="text-xs font-semibold text-rose-500">{t(errors.service_id.message as string)}</p>
                    )}
                  </div>

                    {!isAnonymous && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <User className="size-4 text-emerald-600" />
                            <span>{t('survey.name')}</span> <span className="text-rose-500">*</span>
                          </Label>
                          <Controller
                            name="respondent_name"
                            control={control}
                            render={({ field }) => (
                              <Input 
                                placeholder={locale === 'en' ? 'Enter your full name...' : 'Masukkan nama lengkap Anda...'}
                                {...field} 
                                className="rounded-2xl border-slate-200 text-xs sm:text-sm font-semibold py-5"
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^a-zA-Z\s.,'-]/g, '')
                                  const titleCase = val.replace(/\b\w/g, c => c.toUpperCase())
                                  field.onChange(titleCase)
                                }}
                              />
                            )}
                          />
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic pl-1 -mt-0.5">
                            {locale === 'en' ? '* May include academic / religious titles' : '* Bisa dicantumkan beserta gelar (akademis / keagamaan)'}
                          </p>
                          {errors.respondent_name && (
                            <p className="text-xs font-semibold text-rose-500 pl-1">{errors.respondent_name.message}</p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Phone className="size-4 text-emerald-600" />
                            <span>{locale === 'en' ? 'Contact (Phone/WhatsApp)' : 'Kontak (HP/WhatsApp)'}</span> <span className="text-rose-500">*</span>
                          </Label>
                          <Controller
                            name="respondent_contact"
                            control={control}
                            render={({ field }) => (
                              <Input 
                                type="tel"
                                maxLength={13}
                                placeholder="08123456789"
                                {...field}
                                className="rounded-2xl border-slate-200 text-xs sm:text-sm py-5"
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                              />
                            )}
                          />
                          <p className="text-[11px] font-medium text-rose-500 italic pl-1 -mt-0.5">
                            {locale === 'en' ? '* Must be an active phone number' : '* Harus nomor telepon yang aktif'}
                          </p>
                          {errors.respondent_contact && (
                            <p className="text-xs font-semibold text-rose-500 pl-1">{errors.respondent_contact.message}</p>
                          )}
                        </div>
                      </div>
                    )}

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700">
                    <div className="space-y-0.5">
                      <Label className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-500" />
                        <span>{t('survey.anonymous')}</span>
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('survey.anonymous_desc')}</p>
                    </div>
                    <Controller
                      name="is_anonymous"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card className="border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-6">
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="size-5 text-emerald-600" />
                    <span>{t('survey.demographic_info')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {demographicFields.map((field) => {
                    const labelText = locale === 'id' ? field.label_id : field.label_en

                    return (
                      <div key={field.id} className="space-y-2.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                            <FileText className="size-3.5" />
                          </span>
                          <span>{labelText}</span>
                          {field.is_required && <span className="text-rose-500">*</span>}
                        </Label>

                        {field.field_type === 'select' ? (
                          <Select
                            value={demographics[field.id] || ''}
                            onValueChange={(v) => v !== null && handleDemographicChange(field.id, v)}
                          >
                            <SelectTrigger className="w-full rounded-2xl border-slate-200 dark:border-gray-800 py-6 text-xs sm:text-sm font-semibold shadow-xs">
                              <SelectValue placeholder={`-- ${locale === 'id' ? 'Pilih' : 'Select'} ${labelText} --`} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl p-1.5 shadow-xl">
                              {((field.options || field.demographic_options) ? [...(field.options || field.demographic_options)!].sort((a, b) => a.sort_order - b.sort_order) : [])?.map((opt) => (
                                <SelectItem key={opt.id} value={opt.value} className="rounded-xl py-2 cursor-pointer text-xs sm:text-sm font-semibold">
                                  {locale === 'id' ? opt.label_id : opt.label_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.field_type === 'checkbox' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700">
                            {(field.options || field.demographic_options)?.map((opt) => {
                              const currentVals = (demographics[field.id] || '').split(',').filter(Boolean)
                              const isChecked = currentVals.includes(opt.value)
                              return (
                                <label key={opt.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-700 cursor-pointer hover:bg-emerald-50/50 transition-colors shadow-2xs">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let newVals: string[]
                                      if (e.target.checked) {
                                        newVals = [...currentVals, opt.value]
                                      } else {
                                        newVals = currentVals.filter(v => v !== opt.value)
                                      }
                                      handleDemographicChange(field.id, newVals.join(','))
                                    }}
                                    className="size-4 text-emerald-600 rounded focus:ring-emerald-500"
                                  />
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{locale === 'id' ? opt.label_id : opt.label_en}</span>
                                </label>
                              )
                            })}
                          </div>
                        ) : field.field_type === 'toggle' ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Status Opsi ({demographics[field.id]?.startsWith('Ya') ? 'Ya' : 'Tidak'})
                              </span>
                              <Switch
                                checked={demographics[field.id]?.startsWith('Ya') || false}
                                onCheckedChange={(val) => {
                                  if (val) {
                                    handleDemographicChange(field.id, 'Ya')
                                  } else {
                                    handleDemographicChange(field.id, 'Tidak')
                                  }
                                }}
                              />
                            </div>                            {/* Sub-options Checkbox List (Tampil saat Toggle = Ya) */}
                            {demographics[field.id]?.startsWith('Ya') && (field.options || field.demographic_options) && (field.options || field.demographic_options)!.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3"
                              >
                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                  {locale === 'id' 
                                    ? 'Jika ya, silakan pilih opsi/kategori yang sesuai (bisa lebih dari satu):' 
                                    : 'If yes, please select applicable options (multiple allowed):'}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {(field.options || field.demographic_options)!.map((opt) => {
                                    const currentValStr = demographics[field.id] || 'Ya'
                                    const rawOptsStr = currentValStr.includes('(') ? currentValStr.slice(currentValStr.indexOf('(') + 1, currentValStr.lastIndexOf(')')) : ''
                                    const currentVals = rawOptsStr ? rawOptsStr.split(', ').filter(Boolean) : []
                                    const isChecked = currentVals.includes(opt.value)
                                    return (
                                      <label key={opt.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200/80 dark:border-emerald-900 cursor-pointer hover:bg-emerald-100/50 transition-colors shadow-2xs">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            let newVals: string[]
                                            if (e.target.checked) {
                                              newVals = [...currentVals, opt.value]
                                            } else {
                                              newVals = currentVals.filter(v => v !== opt.value)
                                            }
                                            const updatedStr = newVals.length > 0 ? `Ya (${newVals.join(', ')})` : 'Ya'
                                            handleDemographicChange(field.id, updatedStr)
                                          }}
                                          className="size-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{locale === 'id' ? opt.label_id : opt.label_en}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                                {(!demographics[field.id]?.includes('(') || !demographics[field.id]?.includes(')')) && (
                                  <p className="text-[11px] font-bold text-rose-600 italic flex items-center gap-1 pt-1">
                                    * Wajib memilih minimal 1 kategori disabilitas di atas untuk dapat melanjutkan.
                                  </p>
                                )}
                              </motion.div>
                            )}
                          </div>
                        ) : (
                          <Input
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            placeholder={`Masukkan ${labelText}...`}
                            value={demographics[field.id] || ''}
                            onChange={(e) => handleDemographicChange(field.id, e.target.value)}
                            className="rounded-2xl border-slate-200 text-xs sm:text-sm font-semibold py-5"
                          />
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-emerald-300">
                      <ListTodo className="size-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-black text-white">{t('survey.ipkp_section')}</CardTitle>
                      <p className="text-xs sm:text-sm text-emerald-200/90 font-medium mt-1">
                        {locale === 'en'
                          ? 'Please rate the quality of public services based on your experience.'
                          : 'Silakan berikan penilaian kualitas pelayanan publik berdasarkan pengalaman Anda.'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-8 space-y-6 sm:space-y-8">
                  {ipkpUnsur.map((unsur, uIdx) => (
                    <div key={unsur.id} id={`unsur-block-${unsur.id}`} className="space-y-4 scroll-mt-24 sm:scroll-mt-28">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-gray-800">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                          {uIdx + 1}
                        </span>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white">
                          {locale === 'en' ? (unsur.name_en || unsur.name) : unsur.name}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {unsur.questions.map((q) => (
                          <div 
                            key={q.id} 
                            id={`question-card-${q.id}`} 
                            className="flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 p-3.5 sm:p-6 bg-slate-50/70 dark:bg-gray-800/40 shadow-xs hover:border-emerald-200 transition-colors scroll-mt-24 sm:scroll-mt-28"
                          >
                            <p className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-slate-50 leading-relaxed">
                              {locale === 'id' ? q.question_text_id : q.question_text_en}
                            </p>
                            <StarRating
                              value={answers[q.id] || 0}
                              onChange={(v) => handleAnswerChange(q.id, v)}
                              customLabels={(() => {
                                let parsed: Record<string, string> = {}
                                if (typeof q.rating_labels === 'string') {
                                  try { parsed = JSON.parse(q.rating_labels) } catch { }
                                } else if (q.rating_labels && typeof q.rating_labels === 'object') {
                                  parsed = q.rating_labels as Record<string, string>
                                }
                                return {
                                  4: parsed['4'] || (locale === 'en' ? 'Very Satisfied' : 'Sangat Baik'),
                                  3: parsed['3'] || (locale === 'en' ? 'Satisfied' : 'Baik'),
                                  2: parsed['2'] || (locale === 'en' ? 'Less Satisfied' : 'Kurang Baik'),
                                  1: parsed['1'] || (locale === 'en' ? 'Dissatisfied' : 'Tidak Baik'),
                                }
                              })()}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div id="ipkp-feedback-section" className="pt-6 border-t border-slate-200 dark:border-gray-800 space-y-2 scroll-mt-24 sm:scroll-mt-28">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="size-4 text-emerald-600" />
                      <span>{locale === 'en' ? 'Service Quality Feedback & Suggestions (Optional)' : 'Saran & Kritik Mengenai Kualitas Pelayanan (Opsional)'}</span>
                    </Label>
                    <Textarea
                      value={ipkpFeedback}
                      onChange={(e) => setIpkpFeedback(e.target.value)}
                      placeholder={locale === 'en' ? 'Write your feedback or suggestions regarding service improvement...' : 'Tuliskan saran atau masukan Anda terkait perbaikan pelayanan...'}
                      rows={3}
                      className="rounded-2xl border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-teal-950 via-emerald-900 to-teal-900 text-white p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-emerald-300">
                      <ShieldAlert className="size-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-black text-white">{t('survey.ipak_section')}</CardTitle>
                      <p className="text-xs sm:text-sm text-emerald-200/90 font-medium mt-1">
                        {locale === 'en'
                          ? 'Please rate your perception of integrity and corruption prevention.'
                          : 'Silakan berikan penilaian persepsi integritas dan pencegahan korupsi.'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-8 space-y-6 sm:space-y-8">
                  {ipakUnsur.map((unsur, uIdx) => (
                    <div key={unsur.id} id={`unsur-block-${unsur.id}`} className="space-y-4 scroll-mt-24 sm:scroll-mt-28">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-gray-800">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs font-black">
                          {uIdx + 1}
                        </span>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white">
                          {locale === 'en' ? (unsur.name_en || unsur.name) : unsur.name}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {unsur.questions.map((q) => (
                          <div 
                            key={q.id} 
                            id={`question-card-${q.id}`} 
                            className="flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 p-3.5 sm:p-6 bg-slate-50/70 dark:bg-gray-800/40 shadow-xs hover:border-emerald-200 transition-colors scroll-mt-24 sm:scroll-mt-28"
                          >
                            <p className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-slate-50 leading-relaxed">
                              {locale === 'id' ? q.question_text_id : q.question_text_en}
                            </p>
                            <StarRating
                              value={answers[q.id] || 0}
                              onChange={(v) => handleAnswerChange(q.id, v)}
                              customLabels={(() => {
                                let parsed: Record<string, string> = {}
                                if (typeof q.rating_labels === 'string') {
                                  try { parsed = JSON.parse(q.rating_labels) } catch { }
                                } else if (q.rating_labels && typeof q.rating_labels === 'object') {
                                  parsed = q.rating_labels as Record<string, string>
                                }
                                return {
                                  4: parsed['4'] || (locale === 'en' ? 'Very Satisfied' : 'Sangat Baik'),
                                  3: parsed['3'] || (locale === 'en' ? 'Satisfied' : 'Baik'),
                                  2: parsed['2'] || (locale === 'en' ? 'Less Satisfied' : 'Kurang Baik'),
                                  1: parsed['1'] || (locale === 'en' ? 'Dissatisfied' : 'Tidak Baik'),
                                }
                              })()}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div id="ipak-feedback-section" className="pt-6 border-t border-slate-200 dark:border-gray-800 space-y-2 scroll-mt-24 sm:scroll-mt-28">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="size-4 text-emerald-600" />
                      <span>{locale === 'en' ? 'Corruption Prevention Feedback & Suggestions (Optional)' : 'Saran & Masukan Pencegahan Korupsi (Opsional)'}</span>
                    </Label>
                    <Textarea
                      value={ipakFeedback}
                      onChange={(e) => setIpakFeedback(e.target.value)}
                      placeholder={locale === 'en' ? 'Write your feedback or suggestions regarding corruption prevention...' : 'Tuliskan saran atau masukan Anda terkait pencegahan korupsi...'}
                      rows={3}
                      className="rounded-2xl border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <div className="space-y-6">
                {/* Ringkasan Data Responden */}
                <Card className="border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-6">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="size-5 text-emerald-600" />
                      <span>{locale === 'en' ? 'Respondent Identity & Selected Service' : 'Data Responden & Layanan'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <dl className="divide-y divide-slate-100 dark:divide-gray-800 text-xs sm:text-sm font-semibold">
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Building2 className="size-4 text-emerald-600" />
                          <span>{locale === 'en' ? 'Target Service Type' : 'Jenis Layanan Target'}</span>
                        </dt>
                        <dd className="font-bold text-slate-900 dark:text-white text-right max-w-[60%]">
                          {services.find(s => s.id === selectedServiceId)?.name || '-'}
                        </dd>
                      </div>
                      {isAnonymous ? (
                        <div className="flex justify-between items-center py-3">
                          <dt className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <ShieldCheck className="size-4 text-amber-600" />
                            <span>{locale === 'en' ? 'Respondent Identity' : 'Identitas Responden'}</span>
                          </dt>
                          <dd className="font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <ShieldAlert className="size-3.5" /> {locale === 'en' ? 'Anonymous Entry' : 'Isian Anonim'}
                          </dd>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center py-3">
                            <dt className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <User className="size-4 text-emerald-600" />
                              <span>{locale === 'en' ? 'Respondent Name' : 'Nama Responden'}</span>
                            </dt>
                            <dd className="font-bold text-slate-900 dark:text-white">{respondentName || '-'}</dd>
                          </div>
                          <div className="flex justify-between items-center py-3">
                            <dt className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <Phone className="size-4 text-emerald-600" />
                              <span>{locale === 'en' ? 'Contact (Phone/WhatsApp)' : 'Kontak (HP/WhatsApp)'}</span>
                            </dt>
                            <dd className="font-bold text-slate-900 dark:text-white">{respondentContact || '-'}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Ringkasan Kelengkapan Jawaban */}
                <Card className="border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-6">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <ListTodo className="size-5 text-emerald-600" />
                      <span>{locale === 'en' ? 'Questionnaire Evaluation Completeness' : 'Kelengkapan Evaluasi Kuesioner'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <dl className="divide-y divide-slate-100 dark:divide-gray-800 text-xs sm:text-sm font-semibold">
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-slate-500 dark:text-slate-400">{locale === 'en' ? 'IPKP Index (Service Quality)' : 'Indeks IPKP (Kualitas Pelayanan)'}</dt>
                        <dd>
                          {(() => {
                            const qs = ipkpUnsur.flatMap(u => u.questions)
                            const filled = qs.filter(q => answers[q.id] && answers[q.id] > 0).length
                            const total = qs.length
                            const isFull = filled === total
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                                isFull ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isFull && <Check className="size-3.5" />}
                                {filled}/{total} {locale === 'en' ? 'Questions Completed' : 'Pertanyaan Terisi'}
                              </span>
                            )
                          })()}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-slate-500 dark:text-slate-400">{locale === 'en' ? 'IPAK Index (Corruption Prevention)' : 'Indeks IPAK (Pencegahan Korupsi)'}</dt>
                        <dd>
                          {(() => {
                            const qs = ipakUnsur.flatMap(u => u.questions)
                            const filled = qs.filter(q => answers[q.id] && answers[q.id] > 0).length
                            const total = qs.length
                            const isFull = filled === total
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                                isFull ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isFull && <Check className="size-3.5" />}
                                {filled}/{total} {locale === 'en' ? 'Questions Completed' : 'Pertanyaan Terisi'}
                              </span>
                            )
                          })()}
                        </dd>
                      </div>
                      {ipkpFeedback && (
                        <div className="flex justify-between items-center py-3">
                          <dt className="text-slate-500 dark:text-slate-400">{locale === 'en' ? 'Service Quality Feedback' : 'Saran Kualitas Pelayanan'}</dt>
                          <dd className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="size-4" /> {locale === 'en' ? 'Feedback Filled' : 'Masukan Diisi'}
                          </dd>
                        </div>
                      )}
                      {ipakFeedback && (
                        <div className="flex justify-between items-center py-3">
                          <dt className="text-slate-500 dark:text-slate-400">{locale === 'en' ? 'Corruption Prevention Feedback' : 'Saran Pencegahan Korupsi'}</dt>
                          <dd className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="size-4" /> {locale === 'en' ? 'Feedback Filled' : 'Masukan Diisi'}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Peringatan Konfirmasi */}
                <div className="rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 p-5 flex items-start gap-3.5 shadow-sm">
                  <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
                    {locale === 'en' ? (
                      <>By clicking the <strong>&ldquo;Submit Survey&rdquo;</strong> button, you declare that all answers provided are true and honest. Data will be used for public service quality enhancement at the Ministry of Religious Affairs of Barito Utara Regency.</>
                    ) : (
                      <>Dengan mengklik tombol <strong>&ldquo;Kirim Survei&rdquo;</strong>, Anda menyatakan bahwa seluruh jawaban yang diberikan adalah benar dan jujur. Data akan digunakan untuk peningkatan kualitas pelayanan publik pada Kantor Kementerian Agama Kabupaten Barito Utara.</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div id="survey-step-actions" className="mt-8 flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-gray-800 scroll-mt-20">
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(step - 1)}
            disabled={step === 0}
            className="rounded-2xl px-6 py-6 border-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 group cursor-pointer"
          >
            <ChevronLeft className="mr-2 size-4 text-slate-500 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>{t('common.back')}</span>
          </Button>

          {step < totalSteps - 1 ? (
            <Button 
              type="button" 
              onClick={() => goToStep(step + 1)}
              disabled={!canProceed()}
              className="rounded-2xl px-8 py-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/20 transition-all duration-200 active:scale-95 group cursor-pointer"
            >
              <span>{locale === 'en' ? 'Next' : 'Lanjut'}</span>
              <ChevronRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault()
                handleSubmit(
                  onSubmit,
                  (formErrors) => {
                    console.warn('[SurveiPage] Form validation failed:', formErrors)
                    toast.error(locale === 'en' ? 'Please check your form entries before submitting.' : 'Mohon periksa kembali isian formulir Anda.')
                  }
                )()
              }}
              disabled={!canProceed() || submitting}
              className="rounded-2xl px-9 py-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-xl shadow-emerald-600/25 transition-all duration-200 active:scale-95 group cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              )}
              <span>{locale === 'en' ? 'Submit Survey' : 'Kirim Survei'}</span>
            </Button>
          )}
        </div>
      </form>
        </div>
      </main>
      <Footer />

      {/* Floating Disclaimer / PERHATIAN Modal Dialog portaled directly to document.body */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {disclaimerOpen && (
            <div
              className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 md:p-8 backdrop-blur-md select-none overflow-hidden touch-none"
              style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)', touchAction: 'none' }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <motion.div
                data-modal-content="true"
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg md:max-w-xl max-h-[90vh] flex flex-col my-auto overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] select-text"
              >
                {/* Header Banner */}
                <div className="shrink-0 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 p-4 sm:p-5 md:p-6 text-white text-center relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="mx-auto flex size-10 sm:size-12 md:size-14 items-center justify-center rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md mb-2 sm:mb-2.5 shadow-inner">
                    <ShieldAlert className="size-5 sm:size-7 md:size-8 text-amber-400" />
                  </div>
                  <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                    {locale === 'en' ? 'ATTENTION!' : 'PERHATIAN!'}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-emerald-200/90 mt-0.5 sm:mt-1 font-medium max-w-md mx-auto">
                    {locale === 'en'
                      ? 'Public Satisfaction Survey Respondent Consent Statement'
                      : 'Pernyataan Persetujuan Responden Survei Kepuasan Masyarakat'}
                  </p>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                  <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm md:text-base">
                    {locale === 'en' ? 'I hereby declare that:' : 'Dengan ini saya menyatakan bahwa:'}
                  </p>

                  <div className="space-y-2.5 sm:space-y-3 bg-slate-100 dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-gray-700 font-medium text-[11px] sm:text-xs md:text-sm">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] sm:text-xs font-black mt-0.5">1</span>
                      <p>
                        {locale === 'en' ? (
                          <>I am willing to complete this questionnaire and consent to my data being used for the <strong>Public Satisfaction Survey</strong> at the Ministry of Religious Affairs of Barito Utara Regency.</>
                        ) : (
                          <>Saya bersedia mengisi kuesioner ini dan mengizinkan data pribadi saya digunakan untuk kebutuhan <strong>Survei Kepuasan Masyarakat</strong> pada Kantor Kementerian Agama Kabupaten Barito Utara.</>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] sm:text-xs font-black mt-0.5">2</span>
                      <p>
                        {locale === 'en' ? (
                          <>All data and answers I enter correspond to the <strong>actual facts and true conditions</strong> known to me.</>
                        ) : (
                          <>Semua data dan jawaban yang saya entrikan sudah sesuai dengan <strong>fakta dan kondisi sebenarnya</strong> yang saya ketahui.</>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] sm:text-xs font-black mt-0.5">3</span>
                      <p>
                        {locale === 'en' ? (
                          <>I also assume <strong>full responsibility</strong> for all information filled in this survey form and agree to abide by the provisions regulated under <strong>Law No. 11 of 2008 concerning Electronic Information & Transactions (ITE)</strong>.</>
                        ) : (
                          <>Saya juga <strong>bertanggung jawab penuh</strong> terhadap data dan informasi yang saya isikan pada formulir survei ini dan bersedia mengikuti ketentuan sebagaimana yang diatur dalam <strong>UU Nomor 11 Tahun 2008 tentang ITE</strong>.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-5 bg-slate-50 dark:bg-gray-800/80 border-t border-slate-100 dark:border-gray-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/')}
                    className="w-full sm:w-auto rounded-xl sm:rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-black text-xs sm:text-sm py-2.5 sm:py-3 px-4 sm:px-6 gap-2 cursor-pointer transition-colors"
                  >
                    <X className="size-4" />
                    <span>{locale === 'en' ? 'Disagree' : 'Tidak Setuju'}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setDisclaimerOpen(false)}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-6 sm:px-8 shadow-md sm:shadow-lg shadow-emerald-600/30 hover:scale-[1.01] transition-all gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4 text-emerald-200" />
                    <span>{locale === 'en' ? 'Agree & Continue' : 'Setuju & Lanjutkan'}</span>
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
