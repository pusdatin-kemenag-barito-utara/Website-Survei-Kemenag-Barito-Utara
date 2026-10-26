/**
 * SI-ARUS Multilingual Helpers
 * Provides standardized English translations for Permenpan elements, 
 * rating scale choices, and public service categories.
 */

import type { Service } from '@/types'

// 1. Standard 14 Elements according to Permenpan RB No. 14 / 2017 & Anti-Corruption Index (IPAK)
export const UNSUR_NAME_MAP: Record<string, { id: string; en: string }> = {
  // IPKP (9 Elements)
  'Persyaratan': { 
    id: 'Persyaratan', 
    en: 'Requirements' 
  },
  'Sistem, Mekanisme, dan Prosedur': { 
    id: 'Sistem, Mekanisme, dan Prosedur', 
    en: 'Systems, Mechanisms & Procedures' 
  },
  'Sistem, Mekanisme & Prosedur': { 
    id: 'Sistem, Mekanisme & Prosedur', 
    en: 'Systems, Mechanisms & Procedures' 
  },
  'Waktu Penyelesaian': { 
    id: 'Waktu Penyelesaian', 
    en: 'Completion Time' 
  },
  'Biaya/Tarif': { 
    id: 'Biaya/Tarif', 
    en: 'Fees & Tariffs' 
  },
  'Biaya / Tarif': { 
    id: 'Biaya / Tarif', 
    en: 'Fees & Tariffs' 
  },
  'Produk Spesifikasi Jenis Pelayanan': { 
    id: 'Produk Spesifikasi Jenis Pelayanan', 
    en: 'Service Product Specifications' 
  },
  'Kompetensi Pelaksana': { 
    id: 'Kompetensi Pelaksana', 
    en: 'Officer Competence' 
  },
  'Perilaku Pelaksana': { 
    id: 'Perilaku Pelaksana', 
    en: 'Officer Courtesy & Conduct' 
  },
  'Penanganan Pengaduan, Saran dan Masukan': { 
    id: 'Penanganan Pengaduan, Saran dan Masukan', 
    en: 'Handling of Complaints & Feedback' 
  },
  'Penanganan Pengaduan': { 
    id: 'Penanganan Pengaduan', 
    en: 'Handling of Complaints & Feedback' 
  },
  'Sarana dan Prasarana': { 
    id: 'Sarana dan Prasarana', 
    en: 'Facilities & Infrastructure' 
  },
  'Sarana & Prasarana': { 
    id: 'Sarana & Prasarana', 
    en: 'Facilities & Infrastructure' 
  },

  // IPAK (5 Elements)
  'Percaloan/Perantara Tidak Resmi': { 
    id: 'Percaloan/Perantara Tidak Resmi', 
    en: 'Unauthorized Brokerage & Intermediaries' 
  },
  'Percaloan / Perantara Tidak Resmi': { 
    id: 'Percaloan / Perantara Tidak Resmi', 
    en: 'Unauthorized Brokerage & Intermediaries' 
  },
  'Pungutan Liar (Pungli)': { 
    id: 'Pungutan Liar (Pungli)', 
    en: 'Illegal Levies & Extortion (Pungli)' 
  },
  'Pungutan Liar': { 
    id: 'Pungutan Liar', 
    en: 'Illegal Levies & Extortion' 
  },
  'Pemberian Imbalan/ Gratifikasi': { 
    id: 'Pemberian Imbalan/ Gratifikasi', 
    en: 'Gratuities, Tips & Unofficial Rewards' 
  },
  'Pemberian Imbalan / Gratifikasi': { 
    id: 'Pemberian Imbalan / Gratifikasi', 
    en: 'Gratuities, Tips & Unofficial Rewards' 
  },
  'Diskriminasi Pelayanan': { 
    id: 'Diskriminasi Pelayanan', 
    en: 'Service Discrimination & Bias' 
  },
  'Praktek Suap/Korupsi': { 
    id: 'Praktek Suap/Korupsi', 
    en: 'Bribery & Corruption Practices' 
  },
  'Praktek Suap / Korupsi': { 
    id: 'Praktek Suap / Korupsi', 
    en: 'Bribery & Corruption Practices' 
  },
}

export function getUnsurName(name: string, locale: string, name_en?: string): string {
  if (locale !== 'en') return name
  if (name_en && name_en.trim().length > 0) return name_en
  const trimmed = name.trim()
  if (UNSUR_NAME_MAP[trimmed]) return UNSUR_NAME_MAP[trimmed].en
  return name
}

// 2. Rating Scale Options Translation (Translates Star Rating Option Labels)
export const RATING_LABEL_MAP: Record<string, string> = {
  // Kepuasan
  'Sangat Puas': 'Very Satisfied',
  'Puas': 'Satisfied',
  'Kurang Puas': 'Less Satisfied',
  'Tidak Puas': 'Dissatisfied',

  // Kemudahan
  'Sangat Mudah': 'Very Easy',
  'Mudah': 'Easy',
  'Kurang Mudah': 'Less Easy',
  'Tidak Mudah': 'Difficult',

  // Kesopanan / Keramahan
  'Sangat Sopan / Ramah': 'Very Polite & Friendly',
  'Sopan / Ramah': 'Polite & Friendly',
  'Kurang Sopan / Ramah': 'Less Polite / Friendly',
  'Tidak Sopan / Ramah': 'Impolite / Unfriendly',

  // Ketepatan Waktu
  'Selalu Tepat': 'Always on Time',
  'Banyak Tepatnya': 'Mostly on Time',
  'Kadang-Kadang Tepat': 'Occasionally on Time',
  'Kadang-kadang Tepat': 'Occasionally on Time',
  'Selalu Tidak Tepat': 'Never on Time',

  // Kemampuan Pelaksana
  'Sangat Mampu': 'Very Capable',
  'Mampu': 'Capable',
  'Kurang Mampu': 'Less Capable',
  'Tidak Mampu': 'Incapable',

  // Kualitas / Mutu Umum
  'Sangat Baik': 'Very Good',
  'Baik': 'Good',
  'Kurang Baik': 'Fair',
  'Tidak Baik': 'Poor',

  // Keberadaan Praktik Korupsi (IPAK)
  'Tidak Ada': 'None / Never',
  'Jarang Ada': 'Rarely Present',
  'Sering Ada': 'Frequently Present',
  'Selalu Ada': 'Always Present',
}

/**
 * Returns translated rating labels for a question based on active locale
 */
export function getTranslatedRatingLabels(
  ratingLabels: Record<string, string> | string | undefined | null,
  locale: string
): Record<number, string> {
  let parsed: Record<string, string> = {}
  if (typeof ratingLabels === 'string') {
    try {
      parsed = JSON.parse(ratingLabels)
    } catch {}
  } else if (ratingLabels && typeof ratingLabels === 'object') {
    parsed = ratingLabels as Record<string, string>
  }

  const defaultId: Record<number, string> = {
    4: 'Sangat Baik',
    3: 'Baik',
    2: 'Kurang Baik',
    1: 'Tidak Baik',
  }

  const defaultEn: Record<number, string> = {
    4: 'Very Good',
    3: 'Good',
    2: 'Fair',
    1: 'Poor',
  }

  const result: Record<number, string> = {}
  for (let star = 1; star <= 4; star++) {
    const rawVal = parsed[String(star)]
    if (!rawVal) {
      result[star] = locale === 'en' ? defaultEn[star] : defaultId[star]
      continue
    }

    if (locale === 'en') {
      const translated = RATING_LABEL_MAP[rawVal.trim()]
      result[star] = translated || rawVal
    } else {
      result[star] = rawVal
    }
  }

  return result
}

// 3. Service Categories
export const SERVICE_CATEGORY_MAP: Record<string, { id: string; en: string }> = {
  'Layanan Kepegawaian & SDM': {
    id: 'Layanan Kepegawaian & SDM',
    en: 'Personnel & HR Services',
  },
  'Layanan Penyelenggaraan Haji & Umrah': {
    id: 'Layanan Penyelenggaraan Haji & Umrah',
    en: 'Hajj & Umrah Services',
  },
  'Layanan Pendidikan Agama & Keagamaan': {
    id: 'Layanan Pendidikan Agama & Keagamaan',
    en: 'Religious Education Services',
  },
  'Layanan Bimbingan & Urusan Keagamaan': {
    id: 'Layanan Bimbingan & Urusan Keagamaan',
    en: 'Religious Affairs & Guidance',
  },
  'Layanan Tata Usaha': {
    id: 'Layanan Tata Usaha',
    en: 'General Administration Services',
  },
}

export function getServiceCategory(service: Service | string | null | undefined, locale: string = 'id'): string {
  if (!service) return ''

  if (typeof service === 'string') {
    const trimmed = service.trim()
    if (locale === 'en' && SERVICE_CATEGORY_MAP[trimmed]) {
      return SERVICE_CATEGORY_MAP[trimmed].en
    }
    const lower = trimmed.toLowerCase()
    let rawCategory = trimmed
    if (lower.includes('pensiun') || lower.includes('pangkat') || lower.includes('mutasi') || lower.includes('kepegawaian') || lower.includes('cuti') || lower.includes('kgb')) {
      rawCategory = 'Layanan Kepegawaian & SDM'
    } else if (lower.includes('haji') || lower.includes('umrah') || lower.includes('paspor')) {
      rawCategory = 'Layanan Penyelenggaraan Haji & Umrah'
    } else if (lower.includes('emis') || lower.includes('ijazah') || lower.includes('siswa') || lower.includes('madrasah') || lower.includes('ijin operasional') || lower.includes('tpq') || lower.includes('pesantren')) {
      rawCategory = 'Layanan Pendidikan Agama & Keagamaan'
    } else if (lower.includes('gereja') || lower.includes('rohaniwan') || lower.includes('kua') || lower.includes('nikah') || lower.includes('masjid') || lower.includes('rumah ibadah') || lower.includes('zakat') || lower.includes('wakaf')) {
      rawCategory = 'Layanan Bimbingan & Urusan Keagamaan'
    } else if (lower.includes('tata usaha') || lower.includes('umum') || lower.includes('persuratan') || lower.includes('legalisir')) {
      rawCategory = 'Layanan Tata Usaha'
    }

    if (locale === 'en') {
      return SERVICE_CATEGORY_MAP[rawCategory]?.en || trimmed
    }
    return SERVICE_CATEGORY_MAP[rawCategory]?.id || trimmed
  }

  let rawCategory = 'Layanan Tata Usaha'

  if (service.description && service.description.trim().length > 0) {
    rawCategory = service.description.trim()
  } else if (service.name) {
    const lower = service.name.toLowerCase()
    if (lower.includes('pensiun') || lower.includes('pangkat') || lower.includes('mutasi') || lower.includes('kepegawaian') || lower.includes('cuti') || lower.includes('kgb')) {
      rawCategory = 'Layanan Kepegawaian & SDM'
    } else if (lower.includes('haji') || lower.includes('umrah') || lower.includes('paspor')) {
      rawCategory = 'Layanan Penyelenggaraan Haji & Umrah'
    } else if (lower.includes('emis') || lower.includes('ijazah') || lower.includes('siswa') || lower.includes('madrasah') || lower.includes('ijin operasional') || lower.includes('tpq') || lower.includes('pesantren')) {
      rawCategory = 'Layanan Pendidikan Agama & Keagamaan'
    } else if (lower.includes('gereja') || lower.includes('rohaniwan') || lower.includes('kua') || lower.includes('nikah') || lower.includes('masjid') || lower.includes('rumah ibadah') || lower.includes('zakat') || lower.includes('wakaf')) {
      rawCategory = 'Layanan Bimbingan & Urusan Keagamaan'
    }
  }

  if (locale === 'en') {
    return SERVICE_CATEGORY_MAP[rawCategory]?.en || (SERVICE_CATEGORY_MAP[service.name]?.en || service.name)
  }
  return SERVICE_CATEGORY_MAP[rawCategory]?.id || service.name
}
