
import Image from 'next/image'
import { useI18n } from '@/components/shared/I18nProvider'

export function Footer() {
  const { locale } = useI18n()

  return (
    <footer className="border-t border-gray-100 bg-white py-8">
      <div className="flex flex-col items-center gap-1.5 text-center px-4">
        <div className="flex flex-col items-center justify-center mb-2 gap-2">
          <Image src="/hapakat.webp" alt="HAPAKAT Logo" width={120} height={40} className="h-10 w-auto max-h-10 max-w-[150px] object-contain opacity-90 hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-slate-700 font-medium">
          {locale === 'en' ? (
            <><span className="text-emerald-700 font-bold">H</span>armonious, <span className="text-emerald-700 font-bold">A</span>manah (Trustworthy), <span className="text-emerald-700 font-bold">P</span>rofessional, <span className="text-emerald-700 font-bold">A</span>ccountable, <span className="text-emerald-700 font-bold">K</span>reative, <span className="text-emerald-700 font-bold">A</span>equitable (Fair) and <span className="text-emerald-700 font-bold">T</span>ransparent</>
          ) : (
            <><span className="text-emerald-700 font-bold">H</span>armonis, <span className="text-emerald-700 font-bold">A</span>manah, <span className="text-emerald-700 font-bold">P</span>rofesional, <span className="text-emerald-700 font-bold">A</span>kuntabel, <span className="text-emerald-700 font-bold">K</span>reatif, <span className="text-emerald-700 font-bold">A</span>dil dan <span className="text-emerald-700 font-bold">T</span>ransparan</>
          )}
        </p>
        <div className="mt-3 h-px w-16 bg-slate-200 rounded-full"></div>
        <p className="text-[11px] text-slate-500 mt-2">
          &copy; {new Date().getFullYear()} Kemenag Barito Utara. {locale === 'en' ? 'All Rights Reserved.' : 'Hak Cipta Dilindungi.'} | <a href="https://baritoutara.kemenag.go.id" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-800 font-semibold underline decoration-emerald-300 hover:decoration-emerald-500 transition-colors">baritoutara.kemenag.go.id</a>
        </p>
      </div>
    </footer>
  )
}
