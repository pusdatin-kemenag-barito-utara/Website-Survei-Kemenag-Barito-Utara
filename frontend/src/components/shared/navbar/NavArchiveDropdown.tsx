
import Link from 'next/link'
import { ChevronDown, FolderArchive, Activity, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/components/shared/I18nProvider'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface NavArchiveDropdownProps {
  isActive: boolean
  label: string
}

export function NavArchiveDropdown({ isActive, label }: NavArchiveDropdownProps) {
  const { locale } = useI18n()

  const getArchiveData = () => {
    const currentDate = new Date()
    const cYear = currentDate.getFullYear()
    const cQuarter = Math.floor(currentDate.getMonth() / 3) + 1
    const startYear = 2026
    const startQuarter = 2

    const data = []
    for (let y = cYear; y >= startYear; y--) {
      let qStart = 1
      let qEnd = 4
      
      if (y === startYear) {
        qStart = startQuarter
      }
      if (y === cYear) {
        qEnd = cQuarter
      }
      
      const quarters = []
      for (let q = qStart; q <= qEnd; q++) {
        quarters.push(q)
      }
      
      if (quarters.length > 0) {
        data.push({ 
          year: y, 
          quarters,
          hasSemester1: quarters.includes(2),
          hasSemester2: quarters.includes(4),
          hasTahunan: quarters.includes(4)
        })
      }
    }
    return data
  }

  const archiveData = getArchiveData()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          'group relative flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 focus:outline-none cursor-pointer',
          isActive
            ? 'text-emerald-800 bg-emerald-100/80 border border-emerald-200/80 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        )}
      >
        <FolderArchive className="size-4 text-emerald-600" />
        <span>{label}</span>
        <ChevronDown className="size-3.5 text-slate-400 group-data-[state=open]:rotate-180 transition-transform duration-200" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="w-56 rounded-2xl p-1.5 shadow-2xl shadow-emerald-950/15 border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
        {archiveData.map((item) => (
          <DropdownMenuSub key={item.year}>
            <DropdownMenuSubTrigger className="rounded-xl py-2 px-3 cursor-pointer font-extrabold text-xs text-slate-700 dark:text-slate-200 hover:text-emerald-800 hover:bg-emerald-50/80">
              <FolderArchive className="size-4 mr-2 text-emerald-600 shrink-0" />
              <span>{locale === 'en' ? `${item.year} Archives` : `Arsip Tahun ${item.year}`}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={8} className="w-52 rounded-2xl p-1.5 shadow-2xl shadow-emerald-950/15 border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-xl py-2 px-3 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-800 hover:bg-emerald-50/80">
                  <Activity className="size-4 mr-2 text-emerald-600 shrink-0" />
                  <span>{locale === 'en' ? 'IPKP Index' : 'Indeks IPKP'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={8} className="w-52 rounded-2xl p-1.5 shadow-2xl shadow-emerald-950/15 border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl space-y-0.5">
                  {item.quarters.map((q) => (
                    <Link key={q} href={`/arsip/ipkp/${item.year}/q${q}`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:font-extrabold transition-all">
                        {locale === 'en' ? `Quarter ${q}` : `Triwulan ${q}`} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  ))}
                  {item.hasSemester1 && (
                    <Link href={`/arsip/ipkp/${item.year}/s1`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:font-extrabold transition-all">
                        {locale === 'en' ? 'Semester 1' : 'Semester I'} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {item.hasSemester2 && (
                    <Link href={`/arsip/ipkp/${item.year}/s2`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:font-extrabold transition-all">
                        {locale === 'en' ? 'Semester 2' : 'Semester II'} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {item.hasTahunan && (
                    <Link href={`/arsip/ipkp/${item.year}/tahunan`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/80 hover:bg-emerald-100 transition-all">
                        {locale === 'en' ? 'Annual' : 'Tahunan'} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="my-1 bg-slate-100/80 dark:bg-slate-800" />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-xl py-2 px-3 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-800 hover:bg-emerald-50/80">
                  <ShieldCheck className="size-4 mr-2 text-emerald-600 shrink-0" />
                  <span>{locale === 'en' ? 'IPAK Index' : 'Indeks IPAK'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={8} className="w-52 rounded-2xl p-1.5 shadow-2xl shadow-emerald-950/15 border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl space-y-0.5">
                  {item.quarters.map((q) => (
                    <Link key={q} href={`/arsip/ipak/${item.year}/q${q}`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:font-extrabold transition-all">
                        {locale === 'en' ? `Quarter ${q}` : `Triwulan ${q}`} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  ))}
                  {item.hasSemester1 && (
                    <Link href={`/arsip/ipak/${item.year}/s1`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:font-extrabold transition-all">
                        {locale === 'en' ? 'Semester 1' : 'Semester I'} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {item.hasSemester2 && (
                    <Link href={`/arsip/ipak/${item.year}/s2`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:font-extrabold transition-all">
                        {locale === 'en' ? 'Semester 2' : 'Semester II'} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {item.hasTahunan && (
                    <Link href={`/arsip/ipak/${item.year}/tahunan`}>
                      <DropdownMenuItem className="cursor-pointer text-xs py-2 px-3 rounded-xl font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/80 hover:bg-emerald-100 transition-all">
                        {locale === 'en' ? 'Annual' : 'Tahunan'} ({item.year})
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
