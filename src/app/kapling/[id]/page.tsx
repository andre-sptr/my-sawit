import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityTabs } from '@/components/kapling/activity-tabs'
import { InactiveKaplingPage } from '@/components/kapling/inactive-page'
import {
  ChevronLeftIcon,
  CoinsIcon,
  LeafIcon,
  PalmIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WrenchIcon,
} from '@/components/ui/icons'
import { requirePageAuth } from '@/lib/auth'
import { formatCurrency, formatKg } from '@/lib/date'
import { resolveActivityTab } from '@/lib/kapling-ui'
import { getKaplingWorkspace } from '@/lib/sawit-data'

export const dynamic = 'force-dynamic'

function formatRupiahCompact(value: number) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} jt`
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)} rb`
  }
  return formatCurrency(value)
}

export default async function KaplingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requirePageAuth()
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const initialTab = resolveActivityTab(resolvedSearchParams.tab)

  const data = await getKaplingWorkspace(id)

  if (!data) {
    notFound()
  }

  const { kapling, harvests, maintenance, expenses, sales, maintenanceTypeOptions, expenseCategoryOptions } = data

  if (!kapling.isActive) {
    return (
      <InactiveKaplingPage
        kaplingId={kapling.id}
        kaplingName={kapling.name}
        harvestCount={harvests.length}
        maintenanceCount={maintenance.length}
        expenseCount={expenses.length}
        saleCount={sales.length}
      />
    )
  }

  const totalHarvestKg = harvests.reduce((sum, h) => sum + h.weightKg, 0)
  const totalMaintCost = maintenance.reduce((sum, m) => sum + (m.cost ?? 0), 0)
  const totalExpAmt = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalRevenue = sales.reduce((sum, s) => sum + s.weightKg * s.pricePerKg, 0)
  const netProfit = totalRevenue - (totalMaintCost + totalExpAmt)
  const isProfit = netProfit >= 0
  const totalRecords = harvests.length + maintenance.length + expenses.length + sales.length

  const quickStats = [
    {
      label: 'Panen',
      count: harvests.length,
      metric: totalHarvestKg > 0 ? formatKg(totalHarvestKg) : 'Belum ada data',
      icon: <LeafIcon size={17} />,
      color: '#166534',
      bg: '#dcfce7',
      border: '#bbf7d0',
    },
    {
      label: 'Perawatan',
      count: maintenance.length,
      metric: totalMaintCost > 0 ? formatRupiahCompact(totalMaintCost) : `${maintenance.length} kegiatan`,
      icon: <WrenchIcon size={17} />,
      color: '#075985',
      bg: '#e0f2fe',
      border: '#bae6fd',
    },
    {
      label: 'Pengeluaran',
      count: expenses.length,
      metric: totalExpAmt > 0 ? formatRupiahCompact(totalExpAmt) : 'Belum ada biaya',
      icon: <ReceiptIcon size={17} />,
      color: '#b91c1c',
      bg: '#fee2e2',
      border: '#fecaca',
    },
    {
      label: 'Penjualan',
      count: sales.length,
      metric: totalRevenue > 0 ? formatRupiahCompact(totalRevenue) : 'Belum ada omset',
      icon: <CoinsIcon size={17} />,
      color: '#78350f',
      bg: '#fef3c7',
      border: '#fde68a',
    },
  ]

  return (
    <div className="kapling-container">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <Link href="/" className="breadcrumb-link">
          <ChevronLeftIcon size={14} />
          <span>Dashboard</span>
        </Link>
        <span aria-hidden="true" style={{ color: 'var(--color-border-2)' }}>/</span>
        <span
          aria-current="page"
          style={{
            fontWeight: 700,
            color: 'var(--color-ink-2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {kapling.name}
        </span>
      </nav>

      {/* Kapling Hero Header */}
      <header style={{ marginBottom: 20 }} className="animate-fade-up">
        <div className="kapling-hero">
          <div className="kapling-hero-grid">
            {/* Left: Identity */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(52, 211, 153, 0.16)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    borderRadius: 99,
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#a7f3d0',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }}
                  />
                  <span>Kapling Aktif</span>
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 99,
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#d1fae5',
                  }}
                >
                  <PalmIcon size={13} style={{ color: '#34d399' }} />
                  <span className="font-mono-num">{totalRecords}</span>
                  <span>catatan</span>
                </span>
              </div>

              <h1
                className="font-display"
                style={{
                  margin: '0 0 6px',
                  fontSize: 'clamp(1.45rem, 3vw, 1.9rem)',
                  fontWeight: 700,
                  color: '#f0fdf4',
                  lineHeight: 1.16,
                  letterSpacing: '-0.015em',
                }}
              >
                {kapling.name}
              </h1>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#a7f3d0', opacity: 0.9 }}>
                Catat, pantau, dan kelola seluruh aktivitas kapling ini dari satu tempat.
              </p>
            </div>

            {/* Right: Cumulative Balance */}
            <div className="kapling-hero-balance">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a7f3d0' }}>
                  Saldo Bersih Akumulasi
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isProfit ? 'rgba(34,197,94,0.22)' : 'rgba(220,38,38,0.28)',
                    border: `1px solid ${isProfit ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.42)'}`,
                    borderRadius: 99,
                    padding: '2px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: isProfit ? '#bbf7d0' : '#fecaca',
                  }}
                >
                  {isProfit ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
                  <span>{isProfit ? 'Surplus' : 'Defisit'}</span>
                </span>
              </div>

              <p
                className="font-mono-num"
                style={{
                  margin: '0 0 6px',
                  fontSize: 'clamp(1.15rem, 2.5vw, 1.4rem)',
                  fontWeight: 700,
                  color: isProfit ? '#f0fdf4' : '#fecaca',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {netProfit > 0 ? '+' : netProfit < 0 ? '-' : ''}
                {formatCurrency(Math.abs(netProfit))}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: '0.75rem',
                  color: '#d1fae5',
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  Panen <strong className="font-mono-num" style={{ color: '#fff' }}>{formatKg(totalHarvestKg)}</strong>
                </span>
                <span>
                  Omset <strong className="font-mono-num" style={{ color: '#fff' }}>{formatRupiahCompact(totalRevenue)}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid-stats-4" style={{ marginBottom: 20 }}>
        {quickStats.map((s, i) => (
          <div
            key={s.label}
            className="kpi-card animate-fade-up"
            style={{
              padding: '13px 14px',
              gap: 10,
              animationDelay: `${i * 45}ms`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <span
                className="font-mono-num"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: s.color,
                  background: s.bg,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                {s.count}x
              </span>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)' }}>
                {s.label}
              </div>
              <div
                className="font-mono-num kpi-value"
                style={{
                  marginTop: 2,
                  color: s.count > 0 ? 'var(--color-ink)' : 'var(--color-muted-2)',
                }}
              >
                {s.metric}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Tabs */}
      <ActivityTabs
        kaplingId={kapling.id}
        kaplingName={kapling.name}
        isActive={kapling.isActive}
        initialTab={initialTab}
        harvests={harvests}
        maintenance={maintenance}
        expenses={expenses}
        sales={sales}
        maintenanceTypeOptions={maintenanceTypeOptions}
        expenseCategoryOptions={expenseCategoryOptions}
      />
    </div>
  )
}
