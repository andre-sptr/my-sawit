import { prisma } from '@/lib/prisma'
import {
  formatCurrencyCompact,
  formatDate,
  formatKg,
  getThisMonthRange,
  getThisWeekRange,
  getTodayRange,
} from '@/lib/date'

export { getThisMonthRange, getThisWeekRange, getTodayRange }

// ── pure formatter for report payload ─────────────────────────────────
export type ReportPayload = {
  totalHarvestKg: number
  totalSaleKg: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  harvestCount: number
  saleCount: number
  expenseCount: number
  maintenanceCount: number
}

export function formatReport(
  title: string,
  rangeLabel: string,
  p: ReportPayload,
): string {
  const fc = formatCurrencyCompact
  const lines = [
    `\u{1F4CA} <b>${title}</b>`,
    `<i>${rangeLabel}</i>`,
    '',
    `\u{1F33F} Panen: <b>${formatKg(p.totalHarvestKg)}</b> (${p.harvestCount}x)`,
    `\u{1F4B0} Penjualan: <b>${formatKg(p.totalSaleKg)}</b> = ${fc(p.totalRevenue)} (${p.saleCount}x)`,
    `\u{1F9FE} Pengeluaran: <b>${fc(p.totalExpenses)}</b> (${p.expenseCount + p.maintenanceCount}x)`,
    `\u{1F4C8} Laba bersih: <b>${fc(p.netProfit)}</b>`,
  ]
  return lines.join('\n')
}

// ── data aggregators (hit DB) ─────────────────────────────────────────
async function aggregateRange(range: { start: Date; end: Date }): Promise<ReportPayload> {
  const [harvests, sales, expenses, maintenance] = await Promise.all([
    prisma.harvest.findMany({
      where: { harvestDate: { gte: range.start, lt: range.end } },
      select: { weightKg: true },
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: range.start, lt: range.end } },
      select: { weightKg: true, pricePerKg: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: range.start, lt: range.end } },
      select: { amount: true },
    }),
    prisma.maintenance.findMany({
      where: { activityDate: { gte: range.start, lt: range.end } },
      select: { cost: true },
    }),
  ])

  const totalHarvestKg = harvests.reduce((s, h) => s + h.weightKg, 0)
  const totalSaleKg = sales.reduce((s, x) => s + x.weightKg, 0)
  const totalRevenue = sales.reduce((s, x) => s + x.weightKg * x.pricePerKg, 0)
  const expenseSum = expenses.reduce((s, e) => s + e.amount, 0)
  const maintSum = maintenance.reduce((s, m) => s + (m.cost ?? 0), 0)
  const totalExpenses = expenseSum + maintSum
  return {
    totalHarvestKg,
    totalSaleKg,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    harvestCount: harvests.length,
    saleCount: sales.length,
    expenseCount: expenses.length,
    maintenanceCount: maintenance.length,
  }
}

function rangeLabel(range: { start: Date; end: Date }) {
  // end eksklusif → tampilkan end-1 hari untuk label yg intuitif
  const endDisplay = new Date(range.end.getTime() - 1)
  const startLabel = formatDate(range.start)
  const endLabel = formatDate(endDisplay)
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`
}

export async function buildDailyReport(now = new Date()) {
  const range = getTodayRange(now)
  const payload = await aggregateRange(range)
  return formatReport('Laporan Hari Ini', rangeLabel(range), payload)
}

export async function buildWeeklyReport(now = new Date()) {
  const range = getThisWeekRange(now)
  const payload = await aggregateRange(range)
  return formatReport('Laporan Minggu Ini', rangeLabel(range), payload)
}

export async function buildMonthlyReport(now = new Date()) {
  const range = getThisMonthRange(now)
  const payload = await aggregateRange(range)
  return formatReport('Laporan Bulan Ini', rangeLabel(range), payload)
}

// ── per-kapling summary ───────────────────────────────────────────────
export async function buildKaplingsReport(now = new Date()) {
  const range = getThisMonthRange(now)
  const kaplings = await prisma.kapling.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    include: {
      harvests: {
        where: { harvestDate: { gte: range.start, lt: range.end } },
        select: { weightKg: true },
      },
      sales: {
        where: { saleDate: { gte: range.start, lt: range.end } },
        select: { weightKg: true, pricePerKg: true },
      },
      expenses: {
        where: { expenseDate: { gte: range.start, lt: range.end } },
        select: { amount: true },
      },
      maintenance: {
        where: { activityDate: { gte: range.start, lt: range.end } },
        select: { cost: true },
      },
    },
  })

  const fc = formatCurrencyCompact
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  if (kaplings.length === 0) {
    return '\u{1F331} <b>Kapling aktif</b>\nBelum ada kapling aktif.'
  }

  const lines = [`\u{1F331} <b>Kapling aktif</b> — bulan ini`]
  for (const k of kaplings) {
    const harvestKg = k.harvests.reduce((s, h) => s + h.weightKg, 0)
    const revenue = k.sales.reduce((s, x) => s + x.weightKg * x.pricePerKg, 0)
    const cost =
      k.expenses.reduce((s, e) => s + e.amount, 0) +
      k.maintenance.reduce((s, m) => s + (m.cost ?? 0), 0)
    const profit = revenue - cost
    lines.push(
      `\n• <b>${escape(k.name)}</b>\n  Panen ${formatKg(harvestKg)} · Jual ${fc(revenue)} · Biaya ${fc(cost)} · Laba <b>${fc(profit)}</b>`,
    )
  }
  return lines.join('\n')
}
