import { formatJakartaMonthYear, getJakartaYearMonthKey } from '@/lib/date'

export const KAPLING_TAB_IDS = [
  'panen',
  'perawatan',
  'pengeluaran',
  'penjualan',
  'laporan',
  'pengaturan',
] as const

export type KaplingTabId = (typeof KAPLING_TAB_IDS)[number]

/**
 * Menormalkan parameter query `?tab=...` ke tab kapling yang valid.
 */
export function resolveActivityTab(raw?: string | string[]): KaplingTabId {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first !== 'string') return 'panen'
  const normalized = first.trim().toLowerCase()
  return (KAPLING_TAB_IDS as readonly string[]).includes(normalized)
    ? (normalized as KaplingTabId)
    : 'panen'
}

/**
 * Menghitung pratinjau total pendapatan penjualan (kg × harga/kg).
 * Mengembalikan `null` bila salah satu input kosong atau tidak valid (> 0).
 */
export function computeSaleTotalPreview(weightRaw: string, priceRaw: string): number | null {
  const wStr = weightRaw.trim()
  const pStr = priceRaw.trim()
  if (!wStr || !pStr) return null

  const weight = Number(wStr)
  const price = Number(pStr)
  if (!Number.isFinite(weight) || !Number.isFinite(price) || weight <= 0 || price <= 0) {
    return null
  }

  return Math.round(weight * price)
}

export interface ActivityFilterOptions<T> {
  monthKey?: string
  query?: string
  getDate: (item: T) => Date | string
  getSearchText: (item: T) => string
}

/**
 * Memfilter daftar aktivitas berdasarkan bulan WIB (`YYYY-MM`) dan kata kunci teks.
 */
export function filterActivityRecords<T>(
  records: readonly T[],
  { monthKey, query, getDate, getSearchText }: ActivityFilterOptions<T>
): T[] {
  const activeMonth = monthKey && monthKey !== 'all' ? monthKey.trim() : ''
  const normalizedQuery = query ? query.trim().toLowerCase() : ''

  return records.filter((item) => {
    if (activeMonth && getJakartaYearMonthKey(getDate(item)) !== activeMonth) {
      return false
    }
    if (normalizedQuery && !getSearchText(item).toLowerCase().includes(normalizedQuery)) {
      return false
    }
    return true
  })
}

/**
 * Mengekstrak daftar opsi bulan unik (terbaru di atas) dari riwayat aktivitas.
 */
export function extractMonthOptions<T>(
  records: readonly T[],
  getDate: (item: T) => Date | string
): Array<{ key: string; label: string }> {
  const keys = new Set<string>()
  for (const item of records) {
    keys.add(getJakartaYearMonthKey(getDate(item)))
  }

  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [y, m] = key.split('-').map(Number)
      return { key, label: formatJakartaMonthYear(y, m) }
    })
}
