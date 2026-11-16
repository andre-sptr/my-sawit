import { afterEach, describe, expect, it } from 'vitest'
import {
  formatCurrencyCompact,
  formatDate,
  formatJakartaMonthYear,
  getJakartaYearMonthKey,
  getThisMonthRange,
  getThisWeekRange,
  getTodayRange,
  parseJakartaDateInput,
} from '@/lib/date'

const ORIG_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIG_TZ
})

describe('parseJakartaDateInput', () => {
  it('mem-parse YYYY-MM-DD sebagai 00:00 WIB (17:00 UTC hari sebelumnya)', () => {
    process.env.TZ = 'America/New_York'
    const d = parseJakartaDateInput('2026-07-01')
    expect(d.toISOString()).toBe('2026-06-30T17:00:00.000Z')
  })

  it('menolak format bukan YYYY-MM-DD', () => {
    expect(() => parseJakartaDateInput('01-07-2026')).toThrow(/tidak valid/i)
    expect(() => parseJakartaDateInput('2026-07-01T10:00')).toThrow(/tidak valid/i)
    expect(() => parseJakartaDateInput('')).toThrow(/tidak valid/i)
  })

  it('menolak tanggal kalender yang tidak valid seperti 2026-02-30', () => {
    expect(() => parseJakartaDateInput('2026-02-30')).toThrow(/tidak valid/i)
    expect(() => parseJakartaDateInput('2026-04-31')).toThrow(/tidak valid/i)
    expect(() => parseJakartaDateInput('2026-13-01')).toThrow(/tidak valid/i)
  })
})

describe('formatDate', () => {
  it('selalu memformat tanggal dalam zona waktu Asia/Jakarta meski runtime UTC', () => {
    process.env.TZ = 'UTC'
    const wibMidnight = new Date('2026-06-30T17:00:00.000Z') // 01 Jul 2026 00:00 WIB
    expect(formatDate(wibMidnight)).toBe('01 Jul 2026')
  })
})

describe('getJakartaYearMonthKey', () => {
  it('menghasilkan YYYY-MM berdasarkan kalender Jakarta, bukan UTC', () => {
    process.env.TZ = 'UTC'
    const firstOfJulyWib = new Date('2026-06-30T17:00:00.000Z')
    expect(getJakartaYearMonthKey(firstOfJulyWib)).toBe('2026-07')
    expect(getJakartaYearMonthKey('2026-06-30T17:00:00.000Z')).toBe('2026-07')
  })
})

describe('formatJakartaMonthYear', () => {
  it('memformat nama bulan dan tahun Indonesia tanpa terpengaruh TZ server', () => {
    process.env.TZ = 'America/Los_Angeles'
    expect(formatJakartaMonthYear(2026, 7)).toMatch(/Juli 2026/i)
  })
})

describe('formatCurrencyCompact', () => {
  it('menghapus spasi/NBSP antara Rp dan nominal', () => {
    expect(formatCurrencyCompact(250000)).toBe('Rp250.000')
    expect(formatCurrencyCompact(-50000)).toBe('-Rp50.000')
  })
})

describe('Jakarta range helpers', () => {
  it('getTodayRange, getThisWeekRange, dan getThisMonthRange selaras ke WIB', () => {
    const now = new Date('2026-06-28T10:00:00Z') // Minggu 28 Jun 2026 17:00 WIB
    expect(getTodayRange(now).start.toISOString()).toBe('2026-06-27T17:00:00.000Z')
    expect(getThisWeekRange(now).start.toISOString()).toBe('2026-06-21T17:00:00.000Z') // Senin 22 Jun WIB
    expect(getThisMonthRange(now).start.toISOString()).toBe('2026-05-31T17:00:00.000Z')
  })
})
