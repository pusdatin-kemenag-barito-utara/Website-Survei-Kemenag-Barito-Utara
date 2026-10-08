import { Filter, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Service, SurveyPeriod } from '@/types'

interface ResponFiltersProps {
  services: Service[]
  periods: SurveyPeriod[]
  filterService: string
  setFilterService: (v: string) => void
  filterPeriod: string
  setFilterPeriod: (v: string) => void
  filterDateFrom: string
  setFilterDateFrom: (v: string) => void
  filterDateTo: string
  setFilterDateTo: (v: string) => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  clearFilters: () => void
  setPage: (p: number) => void
}

export function ResponFilters({
  services,
  periods,
  filterService,
  setFilterService,
  filterPeriod,
  setFilterPeriod,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  searchQuery,
  setSearchQuery,
  clearFilters,
  setPage,
}: ResponFiltersProps) {
  return (
    <Card className="border border-slate-200/80 dark:border-gray-800 shadow-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 py-4">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Filter className="size-4 text-emerald-600" />
          Filter Data Respon
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {/* 1. Layanan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Layanan</Label>
            <Select value={filterService || 'ALL'} onValueChange={(v) => { setFilterService(!v || v === 'ALL' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs font-medium h-10">
                <SelectValue placeholder="-- Semua Layanan --">
                  {filterService ? (services.find((s) => s.id === filterService)?.name || '-- Semua Layanan --') : '-- Semua Layanan --'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-60">
                <SelectItem value="ALL" className="rounded-xl text-xs font-bold text-slate-500">
                  -- Semua Layanan --
                </SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="rounded-xl text-xs font-medium cursor-pointer">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Periode Survei */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Periode Survei</Label>
            <Select value={filterPeriod || 'ALL'} onValueChange={(v) => { setFilterPeriod(!v || v === 'ALL' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs font-medium h-10">
                <SelectValue placeholder="-- Semua Periode --">
                  {filterPeriod ? (
                    (() => {
                      const target = periods.find((p) => p.id === filterPeriod)
                      if (!target) return '-- Semua Periode --'
                      const today = new Date().toISOString().split('T')[0]
                      const tag = target.is_active ? '(Aktif)' : (target.end_date && target.end_date < today ? '(Selesai)' : '(Nonaktif)')
                      return `${target.label} ${tag}`
                    })()
                  ) : '-- Semua Periode --'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-60">
                <SelectItem value="ALL" className="rounded-xl text-xs font-bold text-slate-500">
                  -- Semua Periode --
                </SelectItem>
                {periods.map((p) => {
                  const today = new Date().toISOString().split('T')[0]
                  const isPast = Boolean(p.end_date && p.end_date < today)
                  const tag = p.is_active ? '(Aktif)' : (isPast ? '(Selesai)' : '(Nonaktif)')
                  return (
                    <SelectItem key={p.id} value={p.id} className="rounded-xl text-xs font-medium cursor-pointer">
                      <span>{p.label}</span>{' '}
                      <span className={`font-bold ${
                        p.is_active ? 'text-emerald-600' : isPast ? 'text-slate-500' : 'text-amber-600'
                      }`}>
                        {tag}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Dari Tanggal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Dari Tanggal</Label>
            <DatePicker
              value={filterDateFrom}
              onChange={(val) => { setFilterDateFrom(val); setPage(1); }}
              placeholder="Pilih Mulai"
            />
          </div>

          {/* 4. Sampai Tanggal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Sampai Tanggal</Label>
            <DatePicker
              value={filterDateTo}
              onChange={(val) => { setFilterDateTo(val); setPage(1); }}
              placeholder="Pilih Akhir"
            />
          </div>

          {/* 5. Cari Responden */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Pencarian</Label>
              {(filterService || filterPeriod || filterDateFrom || filterDateTo || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-rose-500 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="size-3" />
                  Reset
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari responden..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl bg-white dark:bg-gray-900 border-slate-200 text-xs h-10 font-medium"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
