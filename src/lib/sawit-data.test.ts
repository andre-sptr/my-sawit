import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  kapling: {
    findMany: vi.fn(async (): Promise<unknown[]> => []),
    findUnique: vi.fn(async (): Promise<unknown> => null),
    count: vi.fn(async () => 0),
  },
  harvest: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
  maintenance: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
  expense: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
  sale: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
  dropdownOption: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { getDashboardData } from '@/lib/sawit-data'

describe('getDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('menggabungkan expense ke feed, menampilkan label kustom, dan mempertahankan transaksi kapling nonaktif di total & feed', async () => {
    prismaMock.kapling.findMany.mockResolvedValueOnce([
      { id: 'k1', name: 'Blok A', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ])
    prismaMock.kapling.count.mockResolvedValueOnce(1)

    prismaMock.harvest.findMany
      .mockResolvedValueOnce([
        { kaplingId: 'k1', weightKg: 100 },
        { kaplingId: 'k2', weightKg: 50 }, // kapling nonaktif
      ])
      .mockResolvedValueOnce([
        {
          harvestDate: new Date('2026-07-02T00:00:00Z'),
          weightKg: 100,
          kapling: { id: 'k1', name: 'Blok A', isActive: true },
        },
      ])

    prismaMock.maintenance.findMany.mockResolvedValueOnce([
      {
        kaplingId: 'k1',
        cost: 200_000,
        type: 'MELEPAH',
        activityDate: new Date('2026-07-03T00:00:00Z'),
        kapling: { id: 'k1', name: 'Blok A', isActive: true },
      },
    ])

    prismaMock.expense.findMany.mockResolvedValueOnce([
      {
        kaplingId: 'k2',
        category: 'SEWA_TRUK',
        amount: 300_000,
        expenseDate: new Date('2026-07-04T00:00:00Z'),
        kapling: { id: 'k2', name: 'Blok D', isActive: false },
      },
      {
        kaplingId: 'k1',
        category: 'GAJI_KARYAWAN',
        amount: 400_000,
        expenseDate: new Date('2026-07-01T00:00:00Z'),
        kapling: { id: 'k1', name: 'Blok A', isActive: true },
      },
    ])

    prismaMock.sale.findMany
      .mockResolvedValueOnce([{ kaplingId: 'k1', weightKg: 100, pricePerKg: 2500 }])
      .mockResolvedValueOnce([
        {
          saleDate: new Date('2026-07-05T00:00:00Z'),
          weightKg: 100,
          pricePerKg: 2500,
          kapling: { id: 'k1', name: 'Blok A', isActive: true },
        },
      ])

    prismaMock.dropdownOption.findMany
      .mockResolvedValueOnce([{ value: 'MELEPAH', label: 'Melepah' }])
      .mockResolvedValueOnce([{ value: 'SEWA_TRUK', label: 'Sewa Truk' }])

    const data = await getDashboardData({ year: 2026, month: 7 })

    // Summary tetap menghitung kapling nonaktif (50kg panen + 300rb expense)
    expect(data.summary.totalHarvestKg).toBe(150)
    expect(data.summary.totalDirectExpenses).toBe(700_000)
    expect(data.summary.totalMaintenanceExpenses).toBe(200_000)
    expect(data.summary.totalExpenses).toBe(900_000)

    // kaplingStats hanya menampilkan kapling aktif
    expect(data.kaplingStats).toHaveLength(1)
    expect(data.kaplingStats[0].kapling.id).toBe('k1')
    expect(data.kaplingStats[0].cost).toBe(600_000)

    // activityFeed mencakup expense + label kustom + flag kaplingIsActive
    const expItem = data.activityFeed.find((item) => item.kind === 'expense')
    expect(expItem).toMatchObject({
      kind: 'expense',
      kaplingName: 'Blok D',
      kaplingIsActive: false,
      categoryLabel: 'Sewa Truk',
      amount: 300_000,
    })

    const maintItem = data.activityFeed.find((item) => item.kind === 'maint')
    expect(maintItem).toMatchObject({
      kind: 'maint',
      typeLabel: 'Melepah',
      kaplingIsActive: true,
    })

    // expenseBreakdown menyelesaikan semua kategori (default & kustom)
    expect(data.expenseBreakdown).toEqual([
      { key: 'GAJI_KARYAWAN', label: 'Gaji karyawan', amount: 400_000 },
      { key: 'SEWA_TRUK', label: 'Sewa Truk', amount: 300_000 },
    ])
  })
})
