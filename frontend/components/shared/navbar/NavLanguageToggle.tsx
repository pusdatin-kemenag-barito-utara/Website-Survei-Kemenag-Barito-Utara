'use client'

import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/components/shared/I18nProvider'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NavLanguageToggle() {
  const { setLocale, locale } = useI18n()

  return (
    <div className="hidden lg:block">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl bg-white hover:bg-emerald-50/50 shadow-xs transition-all duration-200 focus:outline-none cursor-pointer">
          <Image
            src={locale === 'id' ? "https://flagcdn.com/w20/id.png" : "https://flagcdn.com/w20/us.png"}
            alt={locale === 'id' ? "ID" : "EN"}
            width={18} height={13}
            className="w-4 rounded-xs shadow-xs"
            unoptimized
          />
          <span className="uppercase">{locale}</span>
          <ChevronDown className="size-3 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1.5 shadow-xl border-slate-200">
          <DropdownMenuItem onClick={() => setLocale('id')} className={cn("gap-2.5 cursor-pointer rounded-xl py-2 text-xs font-bold", locale === 'id' && "bg-emerald-50 text-emerald-700")}>
            <Image src="https://flagcdn.com/w20/id.png" alt="ID" width={18} height={13} className="w-4 rounded-xs shadow-xs" unoptimized />
            <span>Indonesia</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocale('en')} className={cn("gap-2.5 cursor-pointer rounded-lg py-2 text-xs font-bold", locale === 'en' && "bg-emerald-50 text-emerald-700")}>
            <Image src="https://flagcdn.com/w20/us.png" alt="EN" width={18} height={13} className="w-4 rounded-xs shadow-xs" unoptimized />
            <span>English</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
