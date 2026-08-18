
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, Home, ClipboardList, BarChart3, BookOpen, LogIn, FolderArchive } from 'lucide-react'
import { useI18n } from '@/components/shared/I18nProvider'
import { SURVEY_ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { NavClock } from './navbar/NavClock'
import { NavLanguageToggle } from './navbar/NavLanguageToggle'
import { NavArchiveDropdown } from './navbar/NavArchiveDropdown'
import { NavResultsDropdown } from './navbar/NavResultsDropdown'
import { NavMobileDrawer } from './navbar/NavMobileDrawer'

export function PublicNavbar() {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const currentYear = new Date().getFullYear()

  const links = [
    { href: SURVEY_ROUTES.HOME, label: t('nav.home'), icon: Home },
    { href: SURVEY_ROUTES.SURVEI, label: t('nav.survey'), icon: ClipboardList },
    { href: SURVEY_ROUTES.HASIL, label: `${t('nav.results')} ${currentYear}`, icon: BarChart3 },
    { href: '/arsip', label: t('nav.archives'), icon: FolderArchive },
    { href: SURVEY_ROUTES.PROFIL, label: t('nav.about'), icon: BookOpen },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
        {/* ROW 1: Logo + Utilities */}
        <div className="border-b border-gray-100/80">
          <div className="mx-auto flex h-14 w-full px-4 sm:px-6 lg:px-10 items-center justify-between">
            <Link href={SURVEY_ROUTES.HOME} className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="flex h-10 items-center justify-center">
                <Image src="/arus.webp" alt="ARUS Logo" width={80} height={40} className="h-9 w-auto max-h-9 max-w-[120px] object-contain drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300" />
              </div>
              <div className="flex flex-col leading-none max-w-[400px]">
                <span className="text-[10px] text-emerald-700 font-bold hidden sm:block leading-[1.3] border-l-2 border-emerald-500 pl-2">
                  {locale === 'en' ? (
                    <>Survey Review Recapitulation Analysis<br/>Information System</>
                  ) : (
                    <>Sistem Informasi<br/>Analisis Rekapitulasi Ulasan<br/>Survei Kepuasan Masyarakat</>
                  )}
                </span>
              </div>
              <div className="hidden sm:flex h-9 items-center justify-center pl-2 border-l border-slate-200/90">
                <Image src="/Logo_PANRB.webp" alt="Logo Kementerian PANRB" width={95} height={38} className="h-8 w-auto object-contain drop-shadow-xs group-hover:scale-105 transition-all duration-300" />
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <NavClock />
              <NavLanguageToggle />

              <Link href="/admin/login" className="hidden lg:block">
                <span className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all duration-200 cursor-pointer">
                  <LogIn className="size-4" />
                  <span>{t('nav.login')}</span>
                </span>
              </Link>

              <button
                className="relative flex lg:hidden size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 active:scale-95 cursor-pointer"
                onClick={() => setOpen(true)}
                aria-label="Buka menu"
              >
                <Menu className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Navigation Links (desktop) */}
        <div className="hidden lg:block bg-white/95">
          <div className="mx-auto flex h-12 w-full px-4 sm:px-6 lg:px-10 items-center justify-center gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href

              if (link.href === SURVEY_ROUTES.HASIL) {
                return (
                  <NavResultsDropdown
                    key={link.href}
                    isActive={pathname.startsWith('/hasil')}
                    label={link.label}
                    pathname={pathname}
                  />
                )
              }

              if (link.href === '/arsip') {
                return (
                  <NavArchiveDropdown
                    key={link.href}
                    isActive={pathname.startsWith('/arsip')}
                    label={link.label}
                  />
                )
              }

              return (
                <Link key={link.href} href={link.href}>
                  <span className={cn(
                    'relative flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200',
                    isActive
                      ? 'text-emerald-800 bg-emerald-100/80 border border-emerald-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  )}>
                    <link.icon className="size-4 text-emerald-600" />
                    <span className="whitespace-nowrap">{link.label}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <NavMobileDrawer open={open} setOpen={setOpen} links={links} />
    </>
  )
}
