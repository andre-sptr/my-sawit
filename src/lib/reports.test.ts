import { afterEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  harvest: { findMany: vi.fn(async () => []) },
  sale: { findMany: vi.fn(async () => []) },
  expense: { findMany: vi.fn(async () => []) },
  maintenance: { findMany: vi.fn(async () => []) },
  kapling: { findMany: vi.fn(async () => []) },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import {
  buildDailyReport,
  formatReport,
  getThisMonthRange,
  getThisWeekRange,
  getTodayRange,
} from '@/lib/reports'

const TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = TZ
})

describe('getTodayRange (Jakarta)', () => {
  it('start pada 00:00 Jakarta = 17:00 UTC hari sebelumnya', () => {
    const now = new Date('2026-06-23T10:00:00Z') // 17:00 WIB
    const { start, end } = getTodayRange(now)
    expect(start.toISOString()).toBe('2026-06-22T17:00:00.000Z')
    expect(end.toISOString()).toBe('2026-06-23T17:00:00.000Z')
  })

  it('rentang selalu 24 jam', () => {
    const { start, end } = getTodayRange(new Date('2026-01-15T05:00:00Z'))
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000)
  })
})

describe('getThisWeekRange', () => {
  it('rentang selalu 7 hari (Senin–Minggu)', () => {
    // 2026-06-23 = Selasa WIB
    const { start, end } = getThisWeekRange(new Date('2026-06-23T10:00:00Z'))
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 3600 * 1000)
    // start harus jatuh di hari Senin (Jakarta)
    const startJakartaDay = new Date(start.getTime() + 7 * 3600 * 1000).getUTCDay()
    expect(startJakartaDay).toBe(1) // Monday
  })

  it('hari Minggu WIB → start = Senin 6 hari sebelumnya', () => {
    // 2026-06-28 Minggu WIB (17:00 WIB → 10:00 UTC)
    const { start } = getThisWeekRange(new Date('2026-06-28T10:00:00Z'))
    const startJakartaDay = new Date(start.getTime() + 7 * 3600 * 1000).getUTCDay()
    expect(startJakartaDay).toBe(1)
    // Cek tanggal Jakarta = 22 (Senin sebelumnya)
    const startJakartaDate = new Date(start.getTime() + 7 * 3600 * 1000).getUTCDate()
    expect(startJakartaDate).toBe(22)
  })
})

describe('getThisMonthRange', () => {
  it('cakup 1 bulan penuh, aligned ke Jakarta', () => {
    const { start, end } = getThisMonthRange(new Date('2026-06-23T10:00:00Z'))
    expect(start.toISOString()).toBe('2026-05-31T17:00:00.000Z') // 1 Juni WIB
    expect(end.toISOString()).toBe('2026-06-30T17:00:00.000Z')   // 1 Juli WIB
  })
})

describe('formatReport', () => {
  it('mengandung semua metrik dan judul', () => {
    const out = formatReport('Laporan X', '23 Jun 2026', {
      totalHarvestKg: 100,
      totalSaleKg: 90,
      totalRevenue: 250000,
      totalExpenses: 50000,
      netProfit: 200000,
      harvestCount: 1,
      saleCount: 1,
      expenseCount: 2,
      maintenanceCount: 1,
    })
    expect(out).toContain('Laporan X')
    expect(out).toContain('23 Jun 2026')
    expect(out).toContain('100 kg')
    expect(out).toContain('Rp250.000')
    expect(out).toContain('Rp50.000')
    expect(out).toContain('Rp200.000')
  })
})

describe('buildDailyReport', () => {
  it('label laporan harian memakai tanggal Jakarta saat runtime UTC', async () => {
    process.env.TZ = 'UTC'
    const out = await buildDailyReport(new Date('2026-06-23T10:00:00Z'))
    expect(out).toContain('<i>23 Jun 2026</i>')
    expect(out).not.toContain('22 Jun 2026')
  })
})
