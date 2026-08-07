'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useI18n } from '@/components/shared/I18nProvider'

export function NavClock() {
  const { locale } = useI18n()
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const daysId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const monthsId = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      const monthsEn = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      
      const dayName = locale === 'en' ? daysEn[now.getDay()] : daysId[now.getDay()]
      const monthName = locale === 'en' ? monthsEn[now.getMonth()] : monthsId[now.getMonth()]
      const date = now.getDate()
      const year = now.getFullYear()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')

      let tzLabel = 'WIB'
      try {
        const offsetMinutes = -now.getTimezoneOffset()
        const offsetHours = offsetMinutes / 60
        if (offsetHours === 7) tzLabel = 'WIB'
        else if (offsetHours === 8) tzLabel = 'WITA'
        else if (offsetHours === 9) tzLabel = 'WIT'
        else if (offsetHours >= 0) tzLabel = `UTC+${offsetHours}`
        else tzLabel = `UTC${offsetHours}`
      } catch {
        tzLabel = 'WIB'
      }

      if (locale === 'en') {
        setCurrentTime(`${dayName}, ${monthName} ${date}, ${year} • ${hours}:${minutes} ${tzLabel}`)
      } else {
        setCurrentTime(`${dayName}, ${date} ${monthName} ${year} • ${hours}:${minutes} ${tzLabel}`)
      }
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [locale])

  if (!currentTime) return null

  return (
    <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-700 font-mono text-[11px] font-bold shadow-2xs whitespace-nowrap">
      <div className="relative flex size-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </div>
      <Clock className="size-3.5 text-emerald-600 shrink-0" />
      <span>{currentTime}</span>
    </div>
  )
}
