import { prisma } from '@/lib/prisma'
import { formatCurrency, formatKg } from '@/lib/date'

// ── date range helpers ────────────────────────────────────────────────
// Semua rentang dihitung berbasis Asia/Jakarta (UTC+7). Rentang bersifat
// [start, end) — end eksklusif — sama dengan konvensi getCurrentMonthRange.
const JAKARTA_OFFSET_H = 7
const REPORT_TIME_ZONE = 'Asia/Jakarta'

function jakartaTodayParts(now: Date) {
  // Konversi ke jam Jakarta lalu ambil Y/M/D-nya. Tidak pakai Intl karena
  // di server test-env stabil dengan aritmetika offset.
  const jakartaMs = now.getTime() + JAKARTA_OFFSET_H * 3600 * 1000
  const d = new Date(jakartaMs)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(), // 0 = Minggu
  }
}

export function getTodayRange(now = new Date()) {
  const { year, month, day } = jakartaTodayParts(now)
  const start = new Date(Date.UTC(year, month - 1, day, -JAKARTA_OFFSET_H))
  const end = new Date(Date.UTC(year, month - 1, day + 1, -JAKARTA_OFFSET_H))
  return { start, end }
}

export function getThisWeekRange(now = new Date()) {
  // Minggu Senin–Minggu (ISO). weekday: 0=Minggu, 1=Senin...
  const { year, month, day, weekday } = jakartaTodayParts(now)
  const daysSinceMonday = (weekday + 6) % 7
  const start = new Date(Date.UTC(year, month - 1, day - daysSinceMonday, -JAKARTA_OFFSET_H))
  const end = new Date(Date.UTC(year, month - 1, day - daysSinceMonday + 7, -JAKARTA_OFFSET_H))
  return { start, end }
}

export function getThisMonthRange(now = new Date()) {
  const { year, month } = jakartaTodayParts(now)
  const start = new Date(Date.UTC(year, month - 1, 1, -JAKARTA_OFFSET_H))
  const end = new Date(Date.UTC(year, month, 1, -JAKARTA_OFFSET_H))
  return { start, end }
}

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
  const fc = (n: number) => formatCurrency(n).replace(/\s+/g, '')
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
  const startLabel = formatReportDate(range.start)
  const endLabel = formatReportDate(endDisplay)
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`
}

function formatReportDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: REPORT_TIME_ZONE,
  }).format(date)
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

  const fc = (n: number) => formatCurrency(n).replace(/\s+/g, '')
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
