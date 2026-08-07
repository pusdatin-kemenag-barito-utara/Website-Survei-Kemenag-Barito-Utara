'use client'

import * as React from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Pilih Tanggal', className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse current YYYY-MM-DD value
  const parsedDate = React.useMemo(() => {
    if (!value) return null
    const [y, m, d] = value.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }, [value])

  const [viewMonth, setViewMonth] = React.useState<Date | null>(null)

  const displayedMonth = React.useMemo(() => {
    return viewMonth || parsedDate || new Date()
  }, [viewMonth, parsedDate])

  const year = displayedMonth.getFullYear()
  const month = displayedMonth.getMonth()


  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const handlePrevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1))
  }


  const handleSelectDay = (day: number) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const formatted = `${year}-${mm}-${dd}`
    onChange(formatted)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const formattedDisplay = React.useMemo(() => {
    if (!parsedDate) return null
    return parsedDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }, [parsedDate])


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-left font-semibold text-xs rounded-xl border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-10 px-3.5 shadow-xs hover:border-emerald-300 transition-all cursor-pointer',
              !value && 'text-slate-400 font-normal',
              className
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="size-4 text-emerald-600 shrink-0" />
              <span className="truncate">{formattedDisplay || placeholder}</span>
            </div>
            {value && (
              <span
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                title="Hapus Tanggal"
              >
                <X className="size-3.5" />
              </span>
            )}
          </Button>
        }
      />

      <PopoverContent className="w-72 p-4 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 z-50">
        {/* Month Header Navigation */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition-colors font-bold text-xs"
          >
            &lt;
          </button>
          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition-colors font-bold text-xs"
          >
            &gt;
          </button>
        </div>

        {/* Day Name Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
            <span key={d} className="text-[10px] font-black text-slate-400">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const isSelected =
              parsedDate &&
              parsedDate.getDate() === dayNum &&
              parsedDate.getMonth() === month &&
              parsedDate.getFullYear() === year

            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={cn(
                  'h-8 w-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center',
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : isToday
                    ? 'border-2 border-emerald-500 text-emerald-600 font-black'
                    : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300'
                )}
              >
                {dayNum}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
