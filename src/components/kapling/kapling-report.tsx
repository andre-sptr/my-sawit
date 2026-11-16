'use client'

import { useState, type ReactNode } from 'react'
import type { Expense, Harvest, Maintenance, Sale } from '@prisma/client'
import {
  formatCurrency,
  formatJakartaMonthYear,
  formatKg,
  getJakartaDateParts,
  getJakartaYearMonthKey,
} from '@/lib/date'
import type { DropdownItem } from '@/lib/types'
import {
  BarChartIcon,
  CalendarIcon,
  CoinsIcon,
  LeafIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WrenchIcon,
} from '@/components/ui/icons'

function formatTonLabel(kg: number): string {
  return `~${(kg / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`
}

function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle?: string
  badge?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)' }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {badge && (
        <span
          className="font-mono-num"
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-ink-2)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 99,
            padding: '2px 9px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  badge,
  badgeBg,
  badgeColor,
  color = 'var(--color-ink)',
  iconBg = 'var(--color-surface-2)',
  iconBorder = 'var(--color-border)',
  featuredClass,
  icon,
}: {
  label: string
  value: string
  sub?: string
  badge?: string
  badgeBg?: string
  badgeColor?: string
  color?: string
  iconBg?: string
  iconBorder?: string
  featuredClass?: string
  icon: ReactNode
}) {
  return (
    <div className={`kpi-card${featuredClass ? ` ${featuredClass}` : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: iconBg,
            border: `1px solid ${iconBorder}`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {badge && (
          <span
            className="font-mono-num"
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: badgeColor ?? color,
              background: badgeBg ?? iconBg,
              padding: '2px 8px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 3px',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </p>
        <p className="font-mono-num kpi-value" style={{ color }}>
          {value}
        </p>
        {sub && (
          <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{
          width: `${pct}%`,
          background: color,
        }}
      />
    </div>
  )
}

const COST_COLORS = ['#4338ca', '#0369a1', '#0f766e', '#6d28d9', '#9d174d', '#475569']

export function KaplingReport({
  harvests,
  maintenance,
  expenses,
  sales,
  expenseCategoryOptions,
}: {
  harvests: Harvest[]
  maintenance: Maintenance[]
  expenses: Expense[]
  sales: Sale[]
  expenseCategoryOptions: DropdownItem[]
}) {
  const [selectedYear, setSelectedYear] = useState<'all' | number>('all')

  // Collect all distinct years present across all activity types
  const yearSet = new Set<number>()
  harvests.forEach((h) => yearSet.add(getJakartaDateParts(h.harvestDate).year))
  maintenance.forEach((m) => yearSet.add(getJakartaDateParts(m.activityDate).year))
  expenses.forEach((e) => yearSet.add(getJakartaDateParts(e.expenseDate).year))
  sales.forEach((s) => yearSet.add(getJakartaDateParts(s.saleDate).year))
  const availableYears = Array.from(yearSet).sort((a, b) => b - a)

  if (harvests.length === 0 && sales.length === 0 && expenses.length === 0 && maintenance.length === 0) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '44px 20px',
          color: 'var(--color-muted)',
          display: 'grid',
          gap: 10,
          justifyItems: 'center',
          border: '1.5px dashed var(--color-border-2)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--color-surface-tint)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BarChartIcon size={24} />
        </div>
        <div style={{ maxWidth: 360 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
            Belum ada data untuk dilaporkan
          </h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Mulai catat panen, perawatan, pengeluaran, atau penjualan terlebih dahulu untuk melihat ringkasan dan tren laporan.
          </p>
        </div>
      </div>
    )
  }

  const matchesYear = (date: Date) =>
    selectedYear === 'all' || getJakartaDateParts(date).year === selectedYear

  const fHarvests = harvests.filter((h) => matchesYear(h.harvestDate))
  const fMaintenance = maintenance.filter((m) => matchesYear(m.activityDate))
  const fExpenses = expenses.filter((e) => matchesYear(e.expenseDate))
  const fSales = sales.filter((s) => matchesYear(s.saleDate))

  const totalHarvestKg = fHarvests.reduce((s, h) => s + h.weightKg, 0)
  const totalSaleVolume = fSales.reduce((s, x) => s + x.weightKg, 0)
  const totalRevenue = fSales.reduce((s, x) => s + x.weightKg * x.pricePerKg, 0)
  const totalMaintCost = fMaintenance.reduce((s, m) => s + (m.cost ?? 0), 0)
  const totalExpAmt = fExpenses.reduce((s, e) => s + e.amount, 0)
  const totalExpenses = totalMaintCost + totalExpAmt
  const netProfit = totalRevenue - totalExpenses
  const avgPricePerKg = totalSaleVolume > 0 ? totalRevenue / totalSaleVolume : 0
  const costPerKg = totalHarvestKg > 0 ? totalExpenses / totalHarvestKg : 0
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const isProfit = netProfit >= 0

  const totalCashflow = totalRevenue + totalExpenses
  const revenuePct = totalCashflow > 0 ? (totalRevenue / totalCashflow) * 100 : 0
  const expensePct = totalCashflow > 0 ? (totalExpenses / totalCashflow) * 100 : 0

  const categoryLabels = Object.fromEntries(expenseCategoryOptions.map((o) => [o.value, o.label]))
  const expenseMap = new Map<string, number>()
  for (const e of fExpenses) {
    expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + e.amount)
  }

  const costBreakdownItems = [
    ...Array.from(expenseMap.entries()).map(([cat, value], idx) => ({
      key: cat,
      label: categoryLabels[cat] ?? cat,
      value,
      color:
        cat === 'GAJI_KARYAWAN'
          ? '#4338ca'
          : cat === 'LAIN_LAIN'
            ? '#475569'
            : COST_COLORS[idx % COST_COLORS.length],
      isMaintenance: false,
    })),
    {
      key: '__MAINT__',
      label: 'Biaya Perawatan',
      value: totalMaintCost,
      color: '#b45309',
      isMaintenance: true,
    },
  ]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  type MonthData = {
    harvestKg: number
    revenue: number
    maintCost: number
    expCost: number
    saleCount: number
    harvestCount: number
  }
  const monthMap = new Map<string, MonthData>()

  const getOrCreate = (key: string): MonthData => {
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        harvestKg: 0,
        revenue: 0,
        maintCost: 0,
        expCost: 0,
        saleCount: 0,
        harvestCount: 0,
      })
    }
    return monthMap.get(key)!
  }

  fHarvests.forEach((h) => {
    const m = getOrCreate(getJakartaYearMonthKey(h.harvestDate))
    m.harvestKg += h.weightKg
    m.harvestCount++
  })
  fSales.forEach((s) => {
    const m = getOrCreate(getJakartaYearMonthKey(s.saleDate))
    m.revenue += s.weightKg * s.pricePerKg
    m.saleCount++
  })
  fMaintenance.forEach((m) => {
    const mo = getOrCreate(getJakartaYearMonthKey(m.activityDate))
    mo.maintCost += m.cost ?? 0
  })
  fExpenses.forEach((e) => {
    const m = getOrCreate(getJakartaYearMonthKey(e.expenseDate))
    m.expCost += e.amount
  })

  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number)
      const totalCost = data.maintCost + data.expCost
      const profit = data.revenue - totalCost
      const label = formatJakartaMonthYear(year, month)
      return { key, label, ...data, totalCost, profit }
    })

  const maxMonthRevenue = months.length > 0 ? Math.max(...months.map((m) => m.revenue)) : 0
  const maxMonthHarvest = months.length > 0 ? Math.max(...months.map((m) => m.harvestKg)) : 0
  const sellRatio = totalHarvestKg > 0 ? (totalSaleVolume / totalHarvestKg) * 100 : null
  const periodDesc =
    selectedYear === 'all'
      ? `Akumulasi seluruh periode (${months.length} bulan aktif)`
      : `Tahun ${selectedYear} (${months.length} bulan aktif)`

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {/* Report Scope & Year Filter Bar */}
      <div
        className="card"
        style={{
          padding: '12px 15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--color-primary-light)',
              color: '#166534',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CalendarIcon size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Periode Laporan
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {periodDesc}
            </div>
          </div>
        </div>

        {availableYears.length > 1 && (
          <div className="filter-chip-row" role="group" aria-label="Filter tahun laporan">
            <button
              type="button"
              className="filter-chip"
              aria-pressed={selectedYear === 'all'}
              onClick={() => setSelectedYear('all')}
            >
              Semua Tahun
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                className="filter-chip font-mono-num"
                aria-pressed={selectedYear === yr}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. Ringkasan Finansial */}
      <section>
        <SectionHeader
          title="Ringkasan Finansial"
          subtitle={selectedYear === 'all' ? 'Akumulasi seluruh periode' : `Akumulasi tahun ${selectedYear}`}
        />
        <div className="grid-stats-4">
          <KpiCard
            icon={<CoinsIcon size={17} />}
            label="Total Pendapatan"
            value={formatCurrency(totalRevenue)}
            sub={`${fSales.length} transaksi jual`}
            badge="Omset"
            badgeBg="#fef3c7"
            badgeColor="#78350f"
            color="#78350f"
            iconBg="#fef3c7"
            iconBorder="#fde68a"
          />
          <KpiCard
            icon={<ReceiptIcon size={17} />}
            label="Total Pengeluaran"
            value={formatCurrency(totalExpenses)}
            sub={`${fMaintenance.length + fExpenses.length} entri biaya`}
            badge={totalRevenue > 0 ? `${Math.round((totalExpenses / totalRevenue) * 100)}% dr omset` : 'Biaya'}
            badgeBg="#f1f5f9"
            badgeColor="#334155"
            color="#334155"
            iconBg="#f1f5f9"
            iconBorder="#cbd5e1"
          />
          <KpiCard
            icon={isProfit ? <TrendingUpIcon size={17} /> : <TrendingDownIcon size={17} />}
            label="Laba Bersih"
            value={formatCurrency(netProfit)}
            sub={totalRevenue > 0 ? `Margin ${profitMargin.toFixed(1)}%` : isProfit ? 'Surplus' : 'Defisit'}
            badge={isProfit ? 'Surplus' : 'Defisit'}
            badgeBg={isProfit ? '#dcfce7' : '#fee2e2'}
            badgeColor={isProfit ? '#166534' : '#b91c1c'}
            color={isProfit ? '#166534' : '#b91c1c'}
            iconBg={isProfit ? '#dcfce7' : '#fee2e2'}
            iconBorder={isProfit ? '#bbf7d0' : '#fecaca'}
            featuredClass={isProfit ? 'kpi-card-featured-profit' : 'kpi-card-featured-loss'}
          />
          <KpiCard
            icon={<LeafIcon size={17} />}
            label="Total Panen"
            value={formatKg(totalHarvestKg)}
            sub={`${fHarvests.length} kali panen`}
            badge={totalHarvestKg >= 1000 ? formatTonLabel(totalHarvestKg) : 'TBS'}
            badgeBg="#dcfce7"
            badgeColor="#166534"
            color="#166534"
            iconBg="#dcfce7"
            iconBorder="#bbf7d0"
          />
        </div>

        {totalCashflow > 0 && (
          <div className="card" style={{ marginTop: 12, padding: '12px 15px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                fontSize: '0.75rem',
                marginBottom: 8,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-ink-2)' }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                <span>Pendapatan</span>
                <strong className="font-mono-num" style={{ color: '#166534' }}>
                  {revenuePct.toFixed(0)}%
                </strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-ink-2)' }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                <span>Pengeluaran</span>
                <strong className="font-mono-num" style={{ color: '#b91c1c' }}>
                  {expensePct.toFixed(0)}%
                </strong>
              </span>
            </div>
            <div className="cost-stacked-bar" aria-hidden="true">
              {totalRevenue > 0 && <div style={{ width: `${revenuePct}%`, minWidth: 4, background: '#16a34a' }} />}
              {totalExpenses > 0 && <div style={{ width: `${expensePct}%`, minWidth: 4, background: '#dc2626' }} />}
            </div>
          </div>
        )}
      </section>

      {/* 2. Indikator Kinerja */}
      <section>
        <SectionHeader title="Indikator Kinerja Utama" subtitle="Efisiensi harga jual, biaya produksi, dan serapan panen" />
        <div className="grid-stats-4">
          <KpiCard
            icon={<CoinsIcon size={17} />}
            label="Harga Rata-rata"
            value={avgPricePerKg > 0 ? `Rp ${Math.round(avgPricePerKg).toLocaleString('id-ID')}/kg` : '—'}
            sub={fSales.length > 0 ? 'Rata-rata tertimbang' : 'Belum ada penjualan'}
            color="#78350f"
            iconBg="#fef3c7"
            iconBorder="#fde68a"
          />
          <KpiCard
            icon={<ReceiptIcon size={17} />}
            label="Biaya / kg Panen"
            value={costPerKg > 0 ? `Rp ${Math.round(costPerKg).toLocaleString('id-ID')}/kg` : '—'}
            sub={
              totalHarvestKg > 0 && avgPricePerKg > 0
                ? costPerKg < avgPricePerKg
                  ? `Selisih +Rp ${Math.round(avgPricePerKg - costPerKg).toLocaleString('id-ID')}/kg`
                  : 'Melebihi harga jual'
                : 'Beban per kg TBS'
            }
            badge={
              totalHarvestKg > 0 && avgPricePerKg > 0
                ? costPerKg < avgPricePerKg
                  ? 'Efisien'
                  : 'Tinggi'
                : undefined
            }
            badgeBg={costPerKg < avgPricePerKg ? '#dcfce7' : '#fee2e2'}
            badgeColor={costPerKg < avgPricePerKg ? '#166534' : '#b91c1c'}
            color={
              totalHarvestKg > 0 && avgPricePerKg > 0 && costPerKg < avgPricePerKg
                ? '#166534'
                : totalHarvestKg === 0
                  ? 'var(--color-ink)'
                  : '#b91c1c'
            }
            iconBg="var(--color-surface-2)"
          />
          <KpiCard
            icon={<LeafIcon size={17} />}
            label="Volume Terjual"
            value={formatKg(totalSaleVolume)}
            sub={totalSaleVolume >= 1000 ? formatTonLabel(totalSaleVolume) : `${fSales.length} transaksi jual`}
            color="#166534"
            iconBg="#dcfce7"
            iconBorder="#bbf7d0"
          />
          <KpiCard
            icon={<BarChartIcon size={17} />}
            label="Rasio Jual / Panen"
            value={sellRatio !== null ? `${sellRatio.toFixed(1)}%` : '—'}
            sub={
              sellRatio === null
                ? 'Belum ada panen'
                : sellRatio >= 95
                  ? 'Hampir semua terjual'
                  : 'Sebagian belum terjual'
            }
            badge={sellRatio !== null ? (sellRatio >= 95 ? 'Optimal' : 'Tersisa') : undefined}
            badgeBg={sellRatio !== null && sellRatio >= 95 ? '#dcfce7' : '#fef3c7'}
            badgeColor={sellRatio !== null && sellRatio >= 95 ? '#166534' : '#78350f'}
            color={
              sellRatio === null
                ? 'var(--color-ink)'
                : sellRatio >= 95
                  ? '#166534'
                  : '#92400e'
            }
            iconBg="var(--color-surface-2)"
          />
        </div>
      </section>

      {/* 3. Komposisi Biaya */}
      <section>
        <SectionHeader
          title="Komposisi Biaya"
          subtitle="Proporsi pengeluaran langsung & perawatan kebun"
          badge={costBreakdownItems.length > 0 ? `${costBreakdownItems.length} pos` : undefined}
        />
        {totalExpenses === 0 || costBreakdownItems.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '26px 18px',
              textAlign: 'center',
              color: 'var(--color-muted)',
              fontSize: '0.875rem',
              display: 'grid',
              gap: 8,
              justifyItems: 'center',
            }}
          >
            <ReceiptIcon size={22} style={{ color: 'var(--color-muted-2)', opacity: 0.7 }} />
            <span>Belum ada biaya tercatat pada periode ini.</span>
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: 16,
              display: 'grid',
              gap: 14,
            }}
          >
            <div className="cost-stacked-bar" aria-hidden="true">
              {costBreakdownItems.map((item) => {
                const pct = (item.value / totalExpenses) * 100
                return <div key={item.key} style={{ width: `${pct}%`, minWidth: 4, background: item.color }} />
              })}
            </div>

            {costBreakdownItems.map((item) => {
              const pct = (item.value / totalExpenses) * 100
              return (
                <div key={item.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }}
                      />
                      <span style={{ color: item.color, display: 'flex', flexShrink: 0 }}>
                        {item.isMaintenance ? <WrenchIcon size={14} /> : <ReceiptIcon size={14} />}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--color-ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span
                        className="font-mono-num"
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 99,
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-ink-2)',
                        }}
                      >
                        {pct.toFixed(0)}%
                      </span>
                      <span className="font-mono-num" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={Math.max(pct, 2)} max={100} color={item.color} />
                </div>
              )
            })}

            <div
              style={{
                paddingTop: 12,
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  Total Pengeluaran
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  Langsung <span className="font-mono-num">{formatCurrency(totalExpAmt)}</span> &middot; Perawatan{' '}
                  <span className="font-mono-num">{formatCurrency(totalMaintCost)}</span>
                </span>
              </div>
              <span className="font-mono-num" style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#b91c1c' }}>
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 4. Laporan Bulanan */}
      <section>
        <SectionHeader
          title="Laporan Bulanan"
          subtitle="Rincian performa tiap bulan (terbaru di atas)"
          badge={months.length > 0 ? `${months.length} bulan` : undefined}
        />
        {months.length === 0 ? (
          <div className="card" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Belum ada data bulanan pada periode ini.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {months.map((m, i) => {
              const isMonthProfit = m.profit >= 0
              const isPeakRevenue = maxMonthRevenue > 0 && m.revenue === maxMonthRevenue && months.length > 1
              const monthMargin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : null

              return (
                <article
                  key={m.key}
                  className="panen-record-card animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: 'var(--color-ink)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.label}
                      </span>
                      {isPeakRevenue && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 99,
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            color: '#78350f',
                          }}
                        >
                          Omset Tertinggi
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {m.harvestCount} panen &middot; {m.saleCount} jual
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: isMonthProfit ? '#dcfce7' : '#fee2e2',
                          color: isMonthProfit ? '#166534' : '#b91c1c',
                        }}
                      >
                        {monthMargin !== null ? `Margin ${monthMargin}%` : isMonthProfit ? 'Surplus' : 'Defisit'}
                      </span>
                      <span
                        className="font-mono-num"
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: isMonthProfit ? '#166534' : '#b91c1c',
                        }}
                      >
                        {m.profit > 0 ? '+' : m.profit < 0 ? '-' : ''}
                        {formatCurrency(Math.abs(m.profit))}
                      </span>
                    </div>
                  </div>

                  <div className="kapling-metrics-strip" style={{ marginBottom: m.revenue > 0 ? 10 : 0 }}>
                    <div className="kapling-metric-cell">
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Panen
                      </p>
                      <p
                        className="font-mono-num"
                        style={{
                          margin: '3px 0 0',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: m.harvestKg > 0 ? '#166534' : 'var(--color-muted-2)',
                        }}
                      >
                        {m.harvestKg > 0 ? formatKg(m.harvestKg) : '—'}
                      </p>
                    </div>
                    <div className="kapling-metric-cell">
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Omset
                      </p>
                      <p
                        className="font-mono-num"
                        style={{
                          margin: '3px 0 0',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: m.revenue > 0 ? '#78350f' : 'var(--color-muted-2)',
                        }}
                      >
                        {m.revenue > 0 ? formatCurrency(m.revenue) : '—'}
                      </p>
                    </div>
                    <div className="kapling-metric-cell">
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Biaya
                      </p>
                      <p
                        className="font-mono-num"
                        style={{
                          margin: '3px 0 0',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: m.totalCost > 0 ? '#b91c1c' : 'var(--color-muted-2)',
                        }}
                      >
                        {m.totalCost > 0 ? formatCurrency(m.totalCost) : '—'}
                      </p>
                    </div>
                  </div>

                  {m.revenue > 0 && maxMonthRevenue > 0 && (
                    <ProgressBar
                      value={m.revenue}
                      max={maxMonthRevenue}
                      color={
                        isMonthProfit
                          ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                          : 'linear-gradient(90deg, #dc2626, #f87171)'
                      }
                    />
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* 5. Tren Volume Panen */}
      {months.some((m) => m.harvestKg > 0) && (
        <section>
          <SectionHeader title="Tren Volume Panen" subtitle="Perbandingan hasil panen antar bulan (kronologis)" />
          <div
            className="card"
            style={{
              padding: 16,
              display: 'grid',
              gap: 13,
            }}
          >
            {[...months].reverse().map((m) => {
              if (m.harvestKg <= 0) return null
              const isPeak = m.harvestKg === maxMonthHarvest && months.filter((x) => x.harvestKg > 0).length > 1
              return (
                <div key={m.key}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--color-ink)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.label}
                      </span>
                      {isPeak && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: 99,
                            background: '#dcfce7',
                            color: '#166534',
                          }}
                        >
                          Puncak
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {m.harvestKg >= 1000 && (
                        <span className="font-mono-num" style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                          ({formatTonLabel(m.harvestKg)})
                        </span>
                      )}
                      <span
                        className="font-mono-num"
                        style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#166534' }}
                      >
                        {formatKg(m.harvestKg)}
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    value={m.harvestKg}
                    max={maxMonthHarvest}
                    color={isPeak ? 'linear-gradient(90deg, #15803d, #22c55e)' : 'linear-gradient(90deg, #16a34a, #86efac)'}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
