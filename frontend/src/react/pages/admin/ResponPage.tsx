import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Eye, Trash2, Loader2, ClipboardList, UserCheck, UserX,
  ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import {
  fetchCachedAdminServices,
  fetchCachedAdminPeriods,
  getCachedAdminServicesSync,
  getCachedAdminPeriodsSync,
  getCachedAdminResponsesSync,
  fetchAdminResponsesWithFallback,
  fetchResponseDetailWithFallback,
  invalidateClientCache,
  type ResponseAnswerDetail,
  type ResponseDemographicDetail,
} from '@/lib/data-cache'
import type { Response, Service, SurveyPeriod } from '@/types'
import { ResponFilters } from '@/components/admin/respon/ResponFilters'
import { ResponDetailModal } from '@/components/admin/respon/ResponDetailModal'
import { ResponDeleteDialog } from '@/components/admin/respon/ResponDeleteDialog'

export default function AdminResponPage() {
  const cachedInitial = getCachedAdminResponsesSync()
  const cachedServices = getCachedAdminServicesSync()
  const cachedPeriods = getCachedAdminPeriodsSync()

  const [responses, setResponses] = useState<Response[]>(() => cachedInitial?.data || [])
  const [totalCount, setTotalCount] = useState<number>(() => cachedInitial?.total || 0)
  const [services, setServices] = useState<Service[]>(() => cachedServices || [])
  const [periods, setPeriods] = useState<SurveyPeriod[]>(() => cachedPeriods || [])
  const [loading, setLoading] = useState<boolean>(() => !cachedInitial || (cachedInitial?.data?.length === 0 && cachedInitial?.total === 0))
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Track mount status and request sequencing
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const responsesRef = useRef(responses)
  responsesRef.current = responses

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [filterService, setFilterService] = useState<string>('')
  const [filterPeriod, setFilterPeriod] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Pagination state
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Debounce search input (300ms) only when query actually changes
  useEffect(() => {
    if (searchQuery === debouncedSearchQuery) return
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, debouncedSearchQuery])

  // Detail Modal state
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null)
  const [detailAnswers, setDetailAnswers] = useState<ResponseAnswerDetail[]>([])
  const [detailDemographics, setDetailDemographics] = useState<ResponseDemographicDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<Response | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadMeta() {
      try {
        const [servData, perData] = await Promise.all([
          fetchCachedAdminServices(),
          fetchCachedAdminPeriods(),
        ])
        if (isMountedRef.current) {
          if (servData) setServices(servData)
          if (perData) setPeriods(perData)
        }
      } catch (err) {
        console.error("Load meta error:", err)
      }
    }
    loadMeta()
  }, [])

  const fetchResponses = useCallback(async (forceRefresh = false) => {
    const currentRequestId = ++requestIdRef.current

    if (forceRefresh) {
      setIsRefreshing(true)
    } else if (responsesRef.current.length === 0) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }

    const safetyTimer = setTimeout(() => {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }, 4000)

    try {
      const res = await fetchAdminResponsesWithFallback({
        page,
        limit: pageSize,
        serviceId: filterService || undefined,
        periodId: filterPeriod || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        search: debouncedSearchQuery || undefined,
      }, forceRefresh)

      if (isMountedRef.current && currentRequestId === requestIdRef.current && res) {
        setResponses(res.data || [])
        setTotalCount(res.total || 0)
      }
    } catch (err) {
      console.error('Error fetching responses:', err)
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        toast.error('Gagal mengambil data respon')
      }
    } finally {
      clearTimeout(safetyTimer)
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [page, pageSize, filterService, filterPeriod, filterDateFrom, filterDateTo, debouncedSearchQuery])

  useEffect(() => {
    fetchResponses(true)
  }, [fetchResponses])

  async function openDetail(res: Response) {
    setSelectedResponse(res)
    setDetailOpen(true)
    setDetailLoading(true)

    try {
      const { answers, demographics } = await fetchResponseDetailWithFallback(res.id)
      setDetailAnswers(answers || [])
      setDetailDemographics(demographics || [])
    } catch (err) {
      console.error("Fetch detail error:", err)
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return
    const targetId = deleteDialog.id
    setDeleting(true)
    try {
      await apiFetch(`/admin/responses/${targetId}`, { method: 'DELETE' })
      toast.success('Data respon berhasil dihapus')
      setDeleteDialog(null)
      setResponses((prev) => prev.filter((r) => r.id !== targetId))
      setTotalCount((prev) => Math.max(0, prev - 1))
      invalidateClientCache()
      fetchResponses(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error('Gagal menghapus respon: ' + msg)
    } finally {
      setDeleting(false)
    }
  }

  function clearFilters() {
    setFilterService('')
    setFilterPeriod('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearchQuery('')
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize])

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | string)[] = []
    if (page <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    } else if (page >= totalPages - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      pages.push(page - 1)
      pages.push(page)
      pages.push(page + 1)
      pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, page])

  return (
    <div className="w-full space-y-6">
      {/* Header Banner Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <ClipboardList className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Data Respon Survei
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Kelola, saring, dan analisa seluruh hasil isian data survei responden dari masyarakat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchResponses(true)}
            disabled={loading || isRefreshing}
            className="rounded-2xl text-xs font-bold gap-1.5 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`size-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Menyinkron...' : 'Segarkan Data'}</span>
          </Button>

          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2 rounded-2xl font-bold text-xs">
            Total {totalCount} Respon
          </Badge>
        </div>
      </div>

      {/* Modular Filter Section Card */}
      <ResponFilters
        services={services}
        periods={periods}
        filterService={filterService}
        setFilterService={setFilterService}
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        filterDateFrom={filterDateFrom}
        setFilterDateFrom={setFilterDateFrom}
        filterDateTo={filterDateTo}
        setFilterDateTo={setFilterDateTo}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        clearFilters={clearFilters}
        setPage={setPage}
      />

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60">
              <TableRow className="border-b border-slate-100 dark:border-gray-800">
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-6">Responden</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">Layanan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">Periode</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">Waktu Submit</TableHead>
                <TableHead className="w-32 text-right text-xs font-bold text-slate-700 uppercase tracking-wider pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                    <ClipboardList className="size-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Tidak ada data respon ditemukan</p>
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((r) => (
                  <TableRow key={r.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                          {r.is_anonymous ? <UserX className="size-4 text-amber-600" /> : <UserCheck className="size-4 text-emerald-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {r.respondent_name || 'Responden'}
                            </span>
                            {r.is_anonymous && r.respondent_name === 'Anonim' && (
                              <span className="inline-flex items-center text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded-md">
                                (Anonim)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {r.respondent_contact && r.respondent_contact !== '-' ? r.respondent_contact : '-'}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {r.service?.name || r.services?.name || services.find((s) => s.id === r.service_id || s.original_id === r.service_id)?.name || '-'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {r.period?.label || r.survey_periods?.label || periods.find((p) => p.id === r.period_id || p.original_id === r.period_id)?.label || '-'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(r.submitted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>

                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(r)}
                          className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                          title="Lihat Detail Respon"
                        >
                          <Eye className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteDialog(r)}
                          className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-all cursor-pointer"
                          title="Hapus Respon"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Enhanced Pagination Navigation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Menampilkan <span className="text-slate-900 dark:text-white font-black">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span> - <span className="text-slate-900 dark:text-white font-black">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-slate-900 dark:text-white font-black">{totalCount}</span> Data Respon
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs font-bold gap-1 px-3 cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  <span>Sebelumnya</span>
                </Button>

                {pageNumbers.map((pNum, idx) =>
                  typeof pNum === 'number' ? (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`size-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        pNum === page
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-100 dark:ring-emerald-950'
                          : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  ) : (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400 font-black">
                      ...
                    </span>
                  )
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl text-xs font-bold gap-1 px-3 cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modular Detail Respon Modal Dialog */}
      <ResponDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selectedResponse={selectedResponse}
        services={services}
        periods={periods}
        detailLoading={detailLoading}
        detailAnswers={detailAnswers}
        detailDemographics={detailDemographics}
      />

      {/* Modular Delete Dialog */}
      <ResponDeleteDialog
        deleteDialog={deleteDialog}
        setDeleteDialog={setDeleteDialog}
        confirmDelete={confirmDelete}
        deleting={deleting}
      />
    </div>
  )
}
