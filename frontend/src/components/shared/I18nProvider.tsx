
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import idMessages from '@/messages/id.json'
import enMessages from '@/messages/en.json'

type Messages = typeof idMessages

const messages: Record<string, Messages> = { id: idMessages, en: enMessages }

type TFunction = (key: string) => string

interface I18nContext {
  t: TFunction
  locale: string
  setLocale: (l: string) => void
}

function getStoredLocale(): string {
  if (typeof window === 'undefined') return 'id'
  try {
    const local = localStorage.getItem('locale')
    if (local === 'en' || local === 'id') return local

    const cookies = document.cookie.split(';')
    for (const c of cookies) {
      const trimmed = c.trim()
      if (trimmed.startsWith('locale=')) {
        const val = trimmed.slice(7)
        if (val === 'en' || val === 'id') return val
      }
    }
  } catch {}
  return 'id'
}

const I18nContext = createContext<I18nContext>({
  t: (key) => key,
  locale: 'id',
  setLocale: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => getStoredLocale())

  useEffect(() => {
    const current = getStoredLocale()
    if (current !== locale) {
      setLocaleState(current)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = current
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'locale' && e.newValue && (e.newValue === 'id' || e.newValue === 'en')) {
        setLocaleState(e.newValue)
        document.documentElement.lang = e.newValue
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [locale])

  const setLocale = useCallback((l: string) => {
    const validLocale = l === 'en' ? 'en' : 'id'
    try {
      localStorage.setItem('locale', validLocale)
      document.cookie = `locale=${validLocale}; path=/; max-age=31536000; SameSite=Lax`
      if (typeof document !== 'undefined') {
        document.documentElement.lang = validLocale
      }
    } catch {}

    setLocaleState(validLocale)
  }, [])

  const t: TFunction = useCallback(
    (key) => {
      const keys = key.split('.')
      const currentMessages = messages[locale] || messages.id
      let value: unknown = currentMessages
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          // Fallback to id dictionary if key missing in en
          let fallback: unknown = messages.id
          for (const fbKey of keys) {
            if (fallback && typeof fallback === 'object' && fbKey in fallback) {
              fallback = (fallback as Record<string, unknown>)[fbKey]
            } else {
              return key
            }
          }
          return (fallback as string) || key
        }
      }
      return (value as string) || key
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
