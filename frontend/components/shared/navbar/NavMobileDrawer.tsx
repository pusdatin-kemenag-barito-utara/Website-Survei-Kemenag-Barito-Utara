'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { X, ChevronDown, LogIn, type LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/components/shared/I18nProvider'
import { SURVEY_ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface NavMobileDrawerProps {
  open: boolean
  setOpen: (open: boolean) => void
  links: Array<{ href: string; label: string; icon: LucideIcon }>
}

export function NavMobileDrawer({ open, setOpen, links }: NavMobileDrawerProps) {
  const { t, setLocale, locale } = useI18n()
  const pathname = usePathname()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [expandedArsipType, setExpandedArsipType] = useState<string | null>(null)
  const [expandedArsipYear, setExpandedArsipYear] = useState<number | null>(null)

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
      if (y === startYear) qStart = startQuarter
      if (y === cYear) qEnd = cQuarter
      const quarters = []
      for (let q = qStart; q <= qEnd; q++) quarters.push(q)
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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />

          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[70] h-full w-72 bg-white shadow-2xl flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <Link href={SURVEY_ROUTES.HOME} className="flex items-center" onClick={() => setOpen(false)}>
                <div className="flex h-10 items-center justify-center">
                  <Image src="/arus.webp" alt="ARUS Logo" width={100} height={50} style={{ width: 'auto', height: 'auto' }} className="object-contain" />
                </div>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
                aria-label="Tutup menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
              {links.map((link, i) => {
                const isActive = pathname === link.href || (link.href === SURVEY_ROUTES.HASIL && pathname.startsWith('/hasil'))
                const Icon = link.icon

                if (link.href === SURVEY_ROUTES.HASIL) {
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                      className="flex flex-col gap-1"
                    >
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === link.href ? null : link.href)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                          pathname.startsWith('/hasil') ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('size-4.5', pathname.startsWith('/hasil') ? 'text-emerald-600' : 'text-gray-400')} />
                          {link.label}
                        </div>
                        <ChevronDown className={cn("size-4 transition-transform duration-200", expandedMenu === link.href ? "rotate-180" : "")} />
                      </button>
                      
                      <AnimatePresence>
                        {expandedMenu === link.href && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden flex flex-col gap-1"
                          >
                            <Link
                              href="/hasil/ipkp"
                              onClick={() => setOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ml-4',
                                pathname === '/hasil/ipkp' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                              )}
                            >
                              {t('nav.recap_ipkp')}
                            </Link>
                            <Link
                              href="/hasil/ipak"
                              onClick={() => setOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ml-4',
                                pathname === '/hasil/ipak' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                              )}
                            >
                              {t('nav.recap_ipak')}
                            </Link>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                }

                if (link.href === '/arsip') {
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                      className="flex flex-col gap-1"
                    >
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === link.href ? null : link.href)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                          pathname.startsWith('/arsip') ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('size-4.5', pathname.startsWith('/arsip') ? 'text-emerald-600' : 'text-gray-400')} />
                          {link.label}
                        </div>
                        <ChevronDown className={cn("size-4 transition-transform duration-200", expandedMenu === link.href ? "rotate-180" : "")} />
                      </button>

                      <AnimatePresence>
                        {expandedMenu === link.href && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden flex flex-col gap-4 mt-2 px-1"
                          >
                            {['IPKP', 'IPAK'].map(type => (
                              <div key={type} className="flex flex-col">
                                <button
                                  onClick={() => setExpandedArsipType(expandedArsipType === type ? null : type)}
                                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors ml-4 cursor-pointer"
                                >
                                  <span>{locale === 'en' ? `${type} Archives` : `Arsip ${type}`}</span>
                                  <ChevronDown className={cn("size-3.5 transition-transform duration-200", expandedArsipType === type ? "rotate-180" : "")} />
                                </button>
                                <AnimatePresence>
                                  {expandedArsipType === type && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden flex flex-col"
                                    >
                                      {archiveData.map(({ year, quarters, hasSemester1, hasSemester2, hasTahunan }) => (
                                        <div key={year} className="flex flex-col">
                                          <button
                                            onClick={() => setExpandedArsipYear(expandedArsipYear === year ? null : year)}
                                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors ml-8 cursor-pointer"
                                          >
                                            <span>{locale === 'en' ? `Year ${year}` : `Tahun ${year}`}</span>
                                            <ChevronDown className={cn("size-3.5 transition-transform duration-200", expandedArsipYear === year ? "rotate-180" : "")} />
                                          </button>
                                          <AnimatePresence>
                                            {expandedArsipYear === year && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden flex flex-col mt-1 mb-1"
                                              >
                                                {quarters.map(q => (
                                                  <Link key={q} href={`/arsip/${type.toLowerCase()}/${year}/q${q}`} onClick={() => setOpen(false)} className={cn("px-4 py-2.5 text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl ml-12 transition-colors", pathname === `/arsip/${type.toLowerCase()}/${year}/q${q}` ? 'bg-emerald-50 text-emerald-700 font-bold' : '')}>
                                                    {locale === 'en' ? `Quarter ${q}` : `Triwulan ${['I', 'II', 'III', 'IV'][q - 1]}`}
                                                  </Link>
                                                ))}
                                                {hasSemester1 && <Link href={`/arsip/${type.toLowerCase()}/${year}/sem1`} onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl ml-12 transition-colors">{locale === 'en' ? 'Semester 1' : 'Semester 1'}</Link>}
                                                {hasSemester2 && <Link href={`/arsip/${type.toLowerCase()}/${year}/sem2`} onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl ml-12 transition-colors">{locale === 'en' ? 'Semester 2' : 'Semester 2'}</Link>}
                                                {hasTahunan && <Link href={`/arsip/${type.toLowerCase()}/${year}/tahunan`} onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl ml-12 font-semibold transition-colors">{locale === 'en' ? 'Annual' : 'Tahunan'}</Link>}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon className={cn('size-4.5', isActive ? 'text-emerald-600' : 'text-gray-400')} />
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>

            <div className="px-4 py-4 border-t border-gray-100 space-y-4">
              <div className="space-y-2">
                <p className="px-3 pb-1 text-[11px] uppercase font-semibold text-gray-400 tracking-wider">{t('common.language')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setLocale('id'); setOpen(false) }}
                    className={cn(
                      "flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer",
                      locale === 'id' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Image src="https://flagcdn.com/w20/id.png" alt="ID" width={20} height={15} className="w-5 rounded-sm shadow-sm" unoptimized /> 
                    Indonesia
                  </button>
                  <button
                    onClick={() => { setLocale('en'); setOpen(false) }}
                    className={cn(
                      "flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer",
                      locale === 'en' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Image src="https://flagcdn.com/w20/us.png" alt="EN" width={20} height={15} className="w-5 rounded-sm shadow-sm" unoptimized /> 
                    English
                  </button>
                </div>
              </div>

              <Link
                href="/admin/login"
                onClick={() => setOpen(false)}
                className="group relative flex w-full items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-extrabold text-white overflow-hidden cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
                  boxShadow: '0 4px 20px rgba(5, 150, 105, 0.4)',
                }}
              >
                <LogIn className="relative size-4" />
                <span className="relative">{t('nav.login')}</span>
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
