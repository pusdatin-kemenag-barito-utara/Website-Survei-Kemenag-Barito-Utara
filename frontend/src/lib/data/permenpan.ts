/**
 * Helper Rumus Mutu dan Konversi Kinerja Pelayanan Publik (Permenpan RB No. 14 Tahun 2017)
 */

export function getMutu(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 88.31) return 'A'
  if (score >= 76.61) return 'B'
  if (score >= 65.0) return 'C'
  return 'D'
}

export function getKategoriMutu(score: number): string {
  if (score >= 88.31) return 'Sangat Baik'
  if (score >= 76.61) return 'Baik'
  if (score >= 65.0) return 'Kurang Baik'
  return 'Tidak Baik'
}

export function getMutuFromAvg(avg: number): 'A' | 'B' | 'C' | 'D' {
  const konversi = avg * 25
  return getMutu(konversi)
}

export function getKategoriMutuFromAvg(avg: number): string {
  const konversi = avg * 25
  return getKategoriMutu(konversi)
}
