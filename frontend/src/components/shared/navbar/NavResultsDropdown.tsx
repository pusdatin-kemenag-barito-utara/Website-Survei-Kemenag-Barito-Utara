
import Link from 'next/link'
import { ChevronDown, Activity, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/components/shared/I18nProvider'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavResultsDropdownProps {
  isActive: boolean
  label: string
  pathname: string
}

export function NavResultsDropdown({ isActive, label, pathname }: NavResultsDropdownProps) {
  const { t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'group relative flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 focus:outline-none cursor-pointer',
          isActive
            ? 'text-emerald-800 bg-emerald-100/80 border border-emerald-200/80 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        )}
      >
        <Activity className="size-4 text-emerald-600" />
        <span>{label}</span>
        <ChevronDown className="size-3.5 text-slate-400 group-data-[state=open]:rotate-180 transition-transform duration-200" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="w-56 rounded-2xl p-1.5 shadow-2xl shadow-emerald-950/15 border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
        <Link href="/hasil/ipkp">
          <DropdownMenuItem className={cn("cursor-pointer rounded-xl py-2 px-3 text-xs font-bold transition-all", pathname === '/hasil/ipkp' ? "bg-emerald-100/80 text-emerald-800" : "text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-700")}>
            <Activity className="size-4 mr-2 text-emerald-600 shrink-0" />
            <span>{t('nav.recap_ipkp')}</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/hasil/ipak">
          <DropdownMenuItem className={cn("cursor-pointer rounded-xl py-2 px-3 text-xs font-bold transition-all", pathname === '/hasil/ipak' ? "bg-emerald-100/80 text-emerald-800" : "text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 hover:text-emerald-700")}>
            <ShieldCheck className="size-4 mr-2 text-emerald-600 shrink-0" />
            <span>{t('nav.recap_ipak')}</span>
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
