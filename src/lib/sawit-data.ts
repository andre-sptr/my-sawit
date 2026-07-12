import { prisma } from '@/lib/prisma'
import { getCurrentMonthRange, getMonthRange } from '@/lib/date'
import type { Summary, DropdownItem } from '@/lib/types'
import { defaultMaintenanceTypes, defaultExpenseCategories, mergeOptions } from '@/lib/types'

export async function getActiveKaplings() {
  return prisma.kapling.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getKaplingById(id: string) {
  return prisma.kapling.findUnique({
    where: { id },
  })
}

export async function getDashboardData(options?: { year?: number; month?: number }) {
  const range = options?.year && options?.month
    ? getMonthRange(options.year, options.month)
    : getCurrentMonthRange()

  const [
    activeKaplings,
    inactiveCount,
    harvests,
    maintenance,
    expenses,
    sales,
    recentHarvests,
    recentSales,
  ] = await Promise.all([
    getActiveKaplings(),
    prisma.kapling.count({ where: { isActive: false } }),
    // Data bulan ini (semua kapling aktif)
    prisma.harvest.findMany({
      where: { harvestDate: { gte: range.start, lt: range.end } },
      select: { kaplingId: true, weightKg: true },
    }),
    prisma.maintenance.findMany({
      where: { activityDate: { gte: range.start, lt: range.end } },
      select: { kaplingId: true, cost: true, type: true, activityDate: true, kapling: { select: { id: true, name: true } } },
      orderBy: { activityDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: range.start, lt: range.end } },
      select: { kaplingId: true, amount: true },
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: range.start, lt: range.end } },
      select: { kaplingId: true, weightKg: true, pricePerKg: true },
    }),
    // Recent harvests bulan ini (untuk feed aktivitas)
    prisma.harvest.findMany({
      where: { harvestDate: { gte: range.start, lt: range.end } },
      include: { kapling: { select: { id: true, name: true } } },
      orderBy: { harvestDate: 'desc' },
      take: 5,
    }),
    // Recent sales bulan ini
    prisma.sale.findMany({
      where: { saleDate: { gte: range.start, lt: range.end } },
      include: { kapling: { select: { id: true, name: true } } },
      orderBy: { saleDate: 'desc' },
      take: 5,
    }),
  ])

  // ── Per-kapling stats bulan ini ──────────────────────────
  const kaplingStats = activeKaplings.map(k => {
    const kHarvests  = harvests.filter(h => h.kaplingId === k.id)
    const kSales     = sales.filter(s => s.kaplingId === k.id)
    const kExpenses  = expenses.filter(e => e.kaplingId === k.id)
    const kMaint     = maintenance.filter(m => m.kaplingId === k.id)

    const harvestKg  = kHarvests.reduce((s, h) => s + h.weightKg, 0)
    const revenue    = kSales.reduce((s, x) => s + x.weightKg * x.pricePerKg, 0)
    const cost       = kExpenses.reduce((s, e) => s + e.amount, 0)
                     + kMaint.reduce((s, m) => s + (m.cost ?? 0), 0)
    return {
      kapling:       k,
      harvestKg,
      revenue,
      cost,
      profit:        revenue - cost,
      harvestCount:  kHarvests.length,
      saleCount:     kSales.length,
    }
  })

  // ── Combined activity feed (merge harvest + sale + maintenance) ──
  type FeedItem =
    | { kind: 'harvest'; date: Date; kaplingId: string; kaplingName: string; weightKg: number }
    | { kind: 'sale';    date: Date; kaplingId: string; kaplingName: string; value: number; weightKg: number }
    | { kind: 'maint';   date: Date; kaplingId: string; kaplingName: string; type: string; cost: number | null }

  const feed: FeedItem[] = [
    ...recentHarvests.map(h => ({
      kind:        'harvest' as const,
      date:        h.harvestDate,
      kaplingId:   h.kapling.id,
      kaplingName: h.kapling.name,
      weightKg:    h.weightKg,
    })),
    ...recentSales.map(s => ({
      kind:        'sale' as const,
      date:        s.saleDate,
      kaplingId:   s.kapling.id,
      kaplingName: s.kapling.name,
      value:       s.weightKg * s.pricePerKg,
      weightKg:    s.weightKg,
    })),
    ...maintenance.slice(0, 5).map(m => ({
      kind:        'maint' as const,
      date:        m.activityDate,
      kaplingId:   m.kapling.id,
      kaplingName: m.kapling.name,
      type:        m.type,
      cost:        m.cost,
    })),
  ]
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .slice(0, 8)

  return {
    activeKaplings,
    inactiveCount,
    kaplingStats,
    activityFeed:    feed,
    summary:         buildSummary({ harvests, maintenance, expenses, sales }),
    monthRange:      range,
  }
}

export async function getKaplingWorkspace(id: string) {
  const kapling = await prisma.kapling.findUnique({ where: { id } })

  if (!kapling) {
    return null
  }

  const [harvests, maintenance, expenses, sales, maintenanceTypeOptions, expenseCategoryOptions] = await Promise.all([
    prisma.harvest.findMany({ where: { kaplingId: id }, orderBy: { harvestDate: 'desc' } }),
    prisma.maintenance.findMany({ where: { kaplingId: id }, orderBy: { activityDate: 'desc' } }),
    prisma.expense.findMany({ where: { kaplingId: id }, orderBy: { expenseDate: 'desc' } }),
    prisma.sale.findMany({ where: { kaplingId: id }, orderBy: { saleDate: 'desc' } }),
    getDropdownOptions('maintenanceType'),
    getDropdownOptions('expenseCategory'),
  ])

  return { kapling, harvests, maintenance, expenses, sales, maintenanceTypeOptions, expenseCategoryOptions }
}

export async function getDropdownOptions(group: string): Promise<DropdownItem[]> {
  const dbOptions = await prisma.dropdownOption.findMany({
    where: { group },
    orderBy: { sortOrder: 'asc' },
    select: { value: true, label: true },
  })
  const defaults = group === 'maintenanceType' ? defaultMaintenanceTypes : defaultExpenseCategories
  return mergeOptions(defaults, dbOptions)
}

function buildSummary({
  harvests,
  maintenance,
  expenses,
  sales,
}: {
  harvests:    Array<{ weightKg: number }>
  maintenance: Array<{ cost: number | null }>
  expenses:    Array<{ amount: number }>
  sales:       Array<{ weightKg: number; pricePerKg: number }>
}): Summary {
  const totalHarvestKg          = harvests.reduce((sum, item) => sum + item.weightKg, 0)
  const totalRevenue             = sales.reduce((sum, item) => sum + item.weightKg * item.pricePerKg, 0)
  const totalDirectExpenses      = expenses.reduce((sum, item) => sum + item.amount, 0)
  const totalMaintenanceExpenses = maintenance.reduce((sum, item) => sum + (item.cost ?? 0), 0)
  const totalExpenses            = totalDirectExpenses + totalMaintenanceExpenses

  return {
    totalHarvestKg,
    totalRevenue,
    totalDirectExpenses,
    totalMaintenanceExpenses,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  }
}

