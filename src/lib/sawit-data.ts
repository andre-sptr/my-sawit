import { prisma } from '@/lib/prisma'
import { getCurrentMonthRange, getMonthRange } from '@/lib/date'
import type { Summary, DropdownItem } from '@/lib/types'
import { defaultMaintenanceTypes, defaultExpenseCategories, getLabel, mergeOptions } from '@/lib/types'

export async function getActiveKaplings() {
  return prisma.kapling.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })
}

export type DashboardFeedItem =
  | {
      kind: 'harvest'
      date: Date
      kaplingId: string
      kaplingName: string
      kaplingIsActive: boolean
      weightKg: number
    }
  | {
      kind: 'sale'
      date: Date
      kaplingId: string
      kaplingName: string
      kaplingIsActive: boolean
      value: number
      weightKg: number
    }
  | {
      kind: 'maint'
      date: Date
      kaplingId: string
      kaplingName: string
      kaplingIsActive: boolean
      type: string
      typeLabel: string
      cost: number | null
    }
  | {
      kind: 'expense'
      date: Date
      kaplingId: string
      kaplingName: string
      kaplingIsActive: boolean
      category: string
      categoryLabel: string
      amount: number
    }

export type ExpenseBreakdownItem = {
  key: string
  label: string
  amount: number
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
    maintenanceTypeOptions,
    expenseCategoryOptions,
  ] = await Promise.all([
    getActiveKaplings(),
    prisma.kapling.count({ where: { isActive: false } }),
    // Data bulan ini (seluruh kapling agar histori laba/rugi tetap akurat meski kapling dinonaktifkan)
    prisma.harvest.findMany({
      where: { harvestDate: { gte: range.start, lt: range.end } },
      select: { kaplingId: true, weightKg: true },
    }),
    prisma.maintenance.findMany({
      where: { activityDate: { gte: range.start, lt: range.end } },
      select: {
        kaplingId: true,
        cost: true,
        type: true,
        activityDate: true,
        kapling: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: { activityDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: range.start, lt: range.end } },
      select: {
        kaplingId: true,
        category: true,
        amount: true,
        expenseDate: true,
        kapling: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: range.start, lt: range.end } },
      select: { kaplingId: true, weightKg: true, pricePerKg: true },
    }),
    prisma.harvest.findMany({
      where: { harvestDate: { gte: range.start, lt: range.end } },
      include: { kapling: { select: { id: true, name: true, isActive: true } } },
      orderBy: { harvestDate: 'desc' },
      take: 5,
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: range.start, lt: range.end } },
      include: { kapling: { select: { id: true, name: true, isActive: true } } },
      orderBy: { saleDate: 'desc' },
      take: 5,
    }),
    getDropdownOptions('maintenanceType'),
    getDropdownOptions('expenseCategory'),
  ])

  // ── Per-kapling stats bulan ini (O(K + N) via Map) ─────────
  type KaplingAgg = {
    harvestKg: number
    revenue: number
    cost: number
    harvestCount: number
    saleCount: number
  }
  const byKapling = new Map<string, KaplingAgg>()
  const ensureAgg = (kaplingId: string): KaplingAgg => {
    let agg = byKapling.get(kaplingId)
    if (!agg) {
      agg = { harvestKg: 0, revenue: 0, cost: 0, harvestCount: 0, saleCount: 0 }
      byKapling.set(kaplingId, agg)
    }
    return agg
  }

  for (const h of harvests) {
    const agg = ensureAgg(h.kaplingId)
    agg.harvestKg += h.weightKg
    agg.harvestCount += 1
  }
  for (const s of sales) {
    const agg = ensureAgg(s.kaplingId)
    agg.revenue += s.weightKg * s.pricePerKg
    agg.saleCount += 1
  }
  for (const e of expenses) {
    ensureAgg(e.kaplingId).cost += e.amount
  }
  for (const m of maintenance) {
    ensureAgg(m.kaplingId).cost += m.cost ?? 0
  }

  const kaplingStats = activeKaplings.map((kapling) => {
    const agg = byKapling.get(kapling.id) ?? {
      harvestKg: 0,
      revenue: 0,
      cost: 0,
      harvestCount: 0,
      saleCount: 0,
    }
    return {
      kapling,
      harvestKg: agg.harvestKg,
      revenue: agg.revenue,
      cost: agg.cost,
      profit: agg.revenue - agg.cost,
      harvestCount: agg.harvestCount,
      saleCount: agg.saleCount,
    }
  })

  // ── Combined activity feed (harvest + sale + maintenance + expense) ──
  const feed: DashboardFeedItem[] = [
    ...recentHarvests.map((h) => ({
      kind: 'harvest' as const,
      date: h.harvestDate,
      kaplingId: h.kapling.id,
      kaplingName: h.kapling.name,
      kaplingIsActive: h.kapling.isActive,
      weightKg: h.weightKg,
    })),
    ...recentSales.map((s) => ({
      kind: 'sale' as const,
      date: s.saleDate,
      kaplingId: s.kapling.id,
      kaplingName: s.kapling.name,
      kaplingIsActive: s.kapling.isActive,
      value: s.weightKg * s.pricePerKg,
      weightKg: s.weightKg,
    })),
    ...maintenance.slice(0, 5).map((m) => ({
      kind: 'maint' as const,
      date: m.activityDate,
      kaplingId: m.kapling.id,
      kaplingName: m.kapling.name,
      kaplingIsActive: m.kapling.isActive,
      type: m.type,
      typeLabel: getLabel(maintenanceTypeOptions, m.type),
      cost: m.cost,
    })),
    ...expenses.slice(0, 5).map((e) => ({
      kind: 'expense' as const,
      date: e.expenseDate,
      kaplingId: e.kapling.id,
      kaplingName: e.kapling.name,
      kaplingIsActive: e.kapling.isActive,
      category: e.category,
      categoryLabel: getLabel(expenseCategoryOptions, e.category),
      amount: e.amount,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8)

  // ── Breakdown pengeluaran per kategori (termasuk kategori kustom) ──
  const expenseTotalsByCategory = new Map<string, number>()
  for (const e of expenses) {
    expenseTotalsByCategory.set(e.category, (expenseTotalsByCategory.get(e.category) ?? 0) + e.amount)
  }
  const expenseBreakdown: ExpenseBreakdownItem[] = Array.from(expenseTotalsByCategory.entries())
    .map(([key, amount]) => ({
      key,
      label: getLabel(expenseCategoryOptions, key),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    activeKaplings,
    inactiveCount,
    kaplingStats,
    activityFeed: feed,
    expenseBreakdown,
    summary: buildSummary({ harvests, maintenance, expenses, sales }),
    monthRange: range,
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
  harvests: Array<{ weightKg: number }>
  maintenance: Array<{ cost: number | null }>
  expenses: Array<{ amount: number }>
  sales: Array<{ weightKg: number; pricePerKg: number }>
}): Summary {
  const totalHarvestKg = harvests.reduce((sum, item) => sum + item.weightKg, 0)
  const totalRevenue = sales.reduce((sum, item) => sum + item.weightKg * item.pricePerKg, 0)
  const totalDirectExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
  const totalMaintenanceExpenses = maintenance.reduce((sum, item) => sum + (item.cost ?? 0), 0)
  const totalExpenses = totalDirectExpenses + totalMaintenanceExpenses

  return {
    totalHarvestKg,
    totalRevenue,
    totalDirectExpenses,
    totalMaintenanceExpenses,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  }
}
