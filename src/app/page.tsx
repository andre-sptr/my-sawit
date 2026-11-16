import Link from 'next/link'
import { SummaryCards } from '@/components/summary-cards'
import { MonthPicker } from '@/components/month-picker'
import {
  BanIcon,
  CalendarIcon,
  ChevronRightIcon,
  CoinsIcon,
  LeafIcon,
  PalmIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WrenchIcon,
} from '@/components/ui/icons'
import { requirePageAuth } from '@/lib/auth'
import {
  formatCurrency,
  formatDate,
  formatJakartaMonthYear,
  formatJakartaNow,
  formatKg,
  getJakartaDateParts,
  getJakartaHour,
} from '@/lib/date'
import { getDashboardData } from '@/lib/sawit-data'

export const dynamic = 'force-dynamic'

function getGreetingText(hour: number) {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function formatRupiah(value: number) {
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

const EXPENSE_PALETTE = ['#4338ca', '#0369a1', '#0f766e', '#6d28d9', '#9d174d', '#475569']

function expenseColor(key: string, index: number) {
  if (key === 'GAJI_KARYAWAN') return '#4338ca'
  if (key === 'LAIN_LAIN') return '#475569'
  return EXPENSE_PALETTE[index % EXPENSE_PALETTE.length]
}

function SectionHead({
  id,
  title,
  sub,
  badge,
}: {
  id: string
  title: string
  sub?: string
  badge?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          id={id}
          style={{
            margin: 0,
            fontSize: '1.0625rem',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
          }}
        >
          {title}
        </h2>
        {sub && (
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            {sub}
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
            padding: '3px 10px',
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

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home({ searchParams }: PageProps) {
  await requirePageAuth()

  const resolvedParams = await searchParams
  const now = new Date()
  const currentParts = getJakartaDateParts(now)

  const yParam = typeof resolvedParams.y === 'string' && resolvedParams.y.trim() !== '' ? Number(resolvedParams.y) : NaN
  const mParam = typeof resolvedParams.m === 'string' && resolvedParams.m.trim() !== '' ? Number(resolvedParams.m) : NaN

  const year = Number.isInteger(yParam) && yParam >= 2000 && yParam <= 2100 ? yParam : currentParts.year
  const month = Number.isInteger(mParam) && mParam >= 1 && mParam <= 12 ? mParam : currentParts.month
  const isCurrentMonth = year === currentParts.year && month === currentParts.month

  const {
    activeKaplings,
    inactiveCount,
    kaplingStats,
    activityFeed,
    expenseBreakdown,
    summary,
  } = await getDashboardData({ year, month })

  const greetingText = getGreetingText(getJakartaHour(now))
  const dayName = formatJakartaNow({ weekday: 'long' }, now)
  const dateLabel = formatJakartaNow({ day: 'numeric', month: 'long', year: 'numeric' }, now)
  const monthLabel = formatJakartaMonthYear(year, month)

  const isProfit = summary.netProfit >= 0
  const maxRevenue = Math.max(0, ...kaplingStats.map((k) => k.revenue))
  const totalCashflow = summary.totalRevenue + summary.totalExpenses
  const revenueSharePct = totalCashflow > 0 ? (summary.totalRevenue / totalCashflow) * 100 : 50
  const expenseSharePct = totalCashflow > 0 ? (summary.totalExpenses / totalCashflow) * 100 : 50

  const costInsightItems = [
    ...expenseBreakdown.map((item, idx) => ({
      key: item.key,
      label: item.label,
      value: item.amount,
      color: expenseColor(item.key, idx),
      isMaintenance: false,
      pct: summary.totalExpenses > 0 ? (item.amount / summary.totalExpenses) * 100 : 0,
    })),
    {
      key: '__MAINT__',
      label: 'Biaya Perawatan Kebun',
      value: summary.totalMaintenanceExpenses,
      color: '#b45309',
      isMaintenance: true,
      pct: summary.totalExpenses > 0 ? (summary.totalMaintenanceExpenses / summary.totalExpenses) * 100 : 0,
    },
  ]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="dashboard-container">
      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <header style={{ marginBottom: 24 }} className="animate-fade-up">
        <div className="dashboard-hero">
          <div className="dashboard-hero-grid">
            {/* Left: Greeting, Title, Status Chips */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <CalendarIcon size={15} style={{ color: '#6ee7b7', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', color: '#a7f3d0', fontWeight: 600 }}>
                  {greetingText} · {dayName}, {dateLabel}
                </span>
              </div>

              <h1
                className="font-display"
                style={{
                  margin: '0 0 14px',
                  fontSize: 'clamp(1.5rem, 3vw, 1.95rem)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: '#f0fdf4',
                  letterSpacing: '-0.015em',
                }}
              >
                Dashboard Kebun Sawit
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: 99,
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#d1fae5',
                  }}
                >
                  <PalmIcon size={14} style={{ color: '#34d399' }} />
                  <span>
                    <span className="font-mono-num">{activeKaplings.length}</span> Kapling Aktif
                  </span>
                </span>

                {inactiveCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(220,38,38,0.22)',
                      border: '1px solid rgba(248,113,113,0.38)',
                      borderRadius: 99,
                      padding: '5px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#fecaca',
                    }}
                  >
                    <BanIcon size={13} />
                    <span>
                      <span className="font-mono-num">{inactiveCount}</span> Nonaktif
                    </span>
                  </span>
                )}

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isCurrentMonth ? 'rgba(52, 211, 153, 0.14)' : 'rgba(245, 158, 11, 0.2)',
                    border: `1px solid ${isCurrentMonth ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.4)'}`,
                    borderRadius: 99,
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isCurrentMonth ? '#a7f3d0' : '#fde68a',
                  }}
                >
                  <span>Periode: {monthLabel}</span>
                </span>
              </div>
            </div>

            {/* Right: Period Net Balance Glass Panel */}
            <div className="dashboard-hero-summary">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#a7f3d0',
                    letterSpacing: '0.02em',
                  }}
                >
                  Saldo Bersih · {monthLabel}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isProfit ? 'rgba(34,197,94,0.22)' : 'rgba(220,38,38,0.28)',
                    border: `1px solid ${isProfit ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.42)'}`,
                    borderRadius: 99,
                    padding: '2px 9px',
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
                  margin: '0 0 12px',
                  fontSize: 'clamp(1.25rem, 2.6vw, 1.55rem)',
                  fontWeight: 700,
                  color: isProfit ? '#f0fdf4' : '#fecaca',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {summary.netProfit > 0 ? '+' : summary.netProfit < 0 ? '-' : ''}
                {formatCurrency(Math.abs(summary.netProfit))}
              </p>

              {/* Revenue vs Expense ratio bar */}
              <div
                aria-hidden="true"
                style={{
                  display: 'flex',
                  height: 6,
                  borderRadius: 99,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.12)',
                  gap: 2,
                  marginBottom: 8,
                }}
              >
                {totalCashflow > 0 ? (
                  <>
                    {summary.totalRevenue > 0 && (
                      <div
                        style={{
                          width: `${revenueSharePct}%`,
                          background: '#34d399',
                          borderRadius: 99,
                        }}
                      />
                    )}
                    {summary.totalExpenses > 0 && (
                      <div
                        style={{
                          width: `${expenseSharePct}%`,
                          background: '#fbbf24',
                          borderRadius: 99,
                        }}
                      />
                    )}
                  </>
                ) : null}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: '0.75rem',
                  color: '#d1fae5',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0 }}
                  />
                  <span>Masuk</span>
                  <strong className="font-mono-num" style={{ color: '#fff' }}>
                    {formatRupiah(summary.totalRevenue)}
                  </strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }}
                  />
                  <span>Keluar</span>
                  <strong className="font-mono-num" style={{ color: '#fff' }}>
                    {formatRupiah(summary.totalExpenses)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── KPI SUMMARY CARDS ───────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <MonthPicker year={year} month={month} currentYear={currentParts.year} currentMonth={currentParts.month} />
        <SummaryCards summary={summary} isCurrentMonth={isCurrentMonth} monthLabel={monthLabel} />
      </section>

      {/* ── TWO-COLUMN DESKTOP WORKSPACE SPLIT ──────────────── */}
      <div className="dashboard-split">
        {/* Left: Kapling Performance */}
        <section aria-labelledby="kapling-perf-heading" style={{ minWidth: 0 }}>
          <SectionHead
            id="kapling-perf-heading"
            title="Performa Kapling"
            sub={`Bulan ${monthLabel} · klik kapling untuk mencatat`}
            badge={`${kaplingStats.length} aktif`}
          />
          {kaplingStats.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {kaplingStats.map((ks, i) => {
                const revPct = maxRevenue > 0 ? (ks.revenue / maxRevenue) * 100 : 0
                const isKProfit = ks.profit >= 0
                const isZeroProfit = ks.profit === 0
                const isTopRevenue = maxRevenue > 0 && ks.revenue === maxRevenue && activeKaplings.length > 1
                return (
                  <Link
                    key={ks.kapling.id}
                    href={`/kapling/${ks.kapling.id}`}
                    className="kapling-link"
                    style={{ textDecoration: 'none', display: 'block', borderRadius: 'var(--radius-lg)' }}
                  >
                    <div
                      style={{ animationDelay: `${i * 55}ms` }}
                      className="kapling-card animate-fade-up card-hover"
                    >
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.9375rem',
                                fontWeight: 700,
                                color: 'var(--color-ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ks.kapling.name}
                            </p>
                            {isTopRevenue && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 99,
                                  background: '#dcfce7',
                                  color: '#166534',
                                  flexShrink: 0,
                                }}
                              >
                                Teratas
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                            <span className="font-mono-num">{ks.harvestCount}</span> panen &middot;{' '}
                            <span className="font-mono-num">{ks.saleCount}</span> penjualan
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <p
                              className="font-mono-num"
                              style={{
                                margin: 0,
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: isZeroProfit
                                  ? 'var(--color-muted)'
                                  : isKProfit
                                    ? '#166534'
                                    : '#b91c1c',
                              }}
                            >
                              {ks.profit > 0 ? '+' : ks.profit < 0 ? '-' : ''}
                              {formatRupiah(Math.abs(ks.profit))}
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
                              laba bersih
                            </p>
                          </div>
                          <ChevronRightIcon size={16} className="kapling-card-arrow" />
                        </div>
                      </div>

                      <div className="kapling-metrics-strip">
                        {[
                          { label: 'Panen', value: ks.harvestKg > 0 ? formatKg(ks.harvestKg) : '—', active: ks.harvestKg > 0, color: '#166534' },
                          { label: 'Omset', value: ks.revenue > 0 ? formatRupiah(ks.revenue) : '—', active: ks.revenue > 0, color: '#92400e' },
                          { label: 'Biaya', value: ks.cost > 0 ? formatRupiah(ks.cost) : '—', active: ks.cost > 0, color: '#b91c1c' },
                        ].map((stat) => (
                          <div key={stat.label} className="kapling-metric-cell">
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: 'var(--color-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {stat.label}
                            </p>
                            <p
                              className="font-mono-num"
                              style={{
                                margin: '3px 0 0',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: stat.active ? stat.color : 'var(--color-muted-2)',
                              }}
                            >
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${revPct}%`,
                              background: isKProfit
                                ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                                : 'linear-gradient(90deg, #dc2626, #f87171)',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            marginTop: 6,
                            fontSize: '0.75rem',
                            color: 'var(--color-muted)',
                          }}
                        >
                          <span>
                            {ks.revenue === 0
                              ? ks.cost > 0
                                ? 'Ada pengeluaran, belum ada omset'
                                : 'Belum ada omset bulan ini'
                              : isTopRevenue
                                ? 'Kontributor omset terbesar'
                                : 'Kontribusi omset'}
                          </span>
                          {maxRevenue > 0 && ks.revenue > 0 && (
                            <span className="font-mono-num" style={{ fontWeight: 600, color: 'var(--color-ink-2)' }}>
                              {revPct.toFixed(0)}% dr teratas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div
              className="card"
              style={{
                padding: '28px 20px',
                border: '1.5px dashed var(--color-border-2)',
                textAlign: 'center',
                color: 'var(--color-muted)',
                fontSize: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <PalmIcon size={24} style={{ color: 'var(--color-primary)', opacity: 0.75 }} />
              <span>Belum ada kapling aktif. Gunakan tombol &ldquo;+&rdquo; di menu samping untuk menambah kapling.</span>
            </div>
          )}
        </section>

        {/* Right: Feed & Cost Insight */}
        <div style={{ display: 'grid', gap: 24, minWidth: 0 }}>
          {/* Activity Feed */}
          <section aria-labelledby="feed-heading" style={{ minWidth: 0 }}>
            <SectionHead
              id="feed-heading"
              title="Aktivitas Terbaru"
              sub={`Semua catatan bulan ${monthLabel}`}
              badge={activityFeed.length > 0 ? `${activityFeed.length} terbaru` : undefined}
            />
            {activityFeed.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  color: 'var(--color-muted)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <LeafIcon size={22} style={{ color: 'var(--color-muted-2)', opacity: 0.7 }} />
                <span>Belum ada aktivitas tercatat pada periode ini.</span>
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {activityFeed.map((item, i) => {
                  const isLast = i === activityFeed.length - 1

                  const meta =
                    item.kind === 'harvest'
                      ? {
                          tab: 'panen',
                          icon: <LeafIcon size={16} />,
                          iconBg: '#dcfce7',
                          iconColor: '#166534',
                          pillBg: '#f0fdf4',
                          pillBorder: '#bbf7d0',
                          pillColor: '#166534',
                          label: 'Panen',
                          detail: formatKg(item.weightKg),
                          detailColor: '#166534',
                        }
                      : item.kind === 'sale'
                        ? {
                            tab: 'penjualan',
                            icon: <CoinsIcon size={16} />,
                            iconBg: '#fef3c7',
                            iconColor: '#92400e',
                            pillBg: '#fffbeb',
                            pillBorder: '#fde68a',
                            pillColor: '#78350f',
                            label: 'Penjualan',
                            detail: formatRupiah(item.value),
                            detailColor: '#92400e',
                          }
                        : item.kind === 'expense'
                          ? {
                              tab: 'pengeluaran',
                              icon: <ReceiptIcon size={16} />,
                              iconBg: '#fee2e2',
                              iconColor: '#b91c1c',
                              pillBg: '#fef2f2',
                              pillBorder: '#fecaca',
                              pillColor: '#b91c1c',
                              label: item.categoryLabel,
                              detail: formatRupiah(item.amount),
                              detailColor: '#b91c1c',
                            }
                          : {
                              tab: 'perawatan',
                              icon: <WrenchIcon size={16} />,
                              iconBg: '#e0f2fe',
                              iconColor: '#0369a1',
                              pillBg: '#f0f9ff',
                              pillBorder: '#bae6fd',
                              pillColor: '#075985',
                              label: item.typeLabel,
                              detail: item.cost != null ? formatRupiah(item.cost) : 'Perawatan',
                              detailColor: '#0369a1',
                            }

                  return (
                    <Link
                      key={`${item.kind}-${item.kaplingId}-${item.date.getTime()}-${i}`}
                      href={`/kapling/${item.kaplingId}?tab=${meta.tab}`}
                      className="feed-list-link"
                    >
                      <div
                        className="list-item-hover"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          minBlockSize: 58,
                          padding: '11px 14px',
                          borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: meta.iconBg,
                            color: meta.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {meta.icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--color-ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.kaplingName}
                            </span>
                            {!item.kaplingIsActive && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 99,
                                  background: 'var(--color-danger-bg)',
                                  color: '#b91c1c',
                                  flexShrink: 0,
                                }}
                              >
                                Nonaktif
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: 99,
                                background: meta.pillBg,
                                border: `1px solid ${meta.pillBorder}`,
                                color: meta.pillColor,
                                flexShrink: 0,
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                            {formatDate(item.date)}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span
                            className="font-mono-num"
                            style={{
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              color: meta.detailColor,
                            }}
                          >
                            {meta.detail}
                          </span>
                          <ChevronRightIcon size={14} className="feed-row-arrow" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Cost Insight */}
          <section aria-labelledby="cost-insight-heading" style={{ minWidth: 0 }}>
            <SectionHead
              id="cost-insight-heading"
              title="Insight Biaya"
              sub={isCurrentMonth ? 'Komposisi pengeluaran bulan ini' : `Komposisi pengeluaran ${monthLabel}`}
              badge={costInsightItems.length > 0 ? `${costInsightItems.length} pos` : undefined}
            />
            {summary.totalExpenses === 0 || costInsightItems.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  color: 'var(--color-muted)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ReceiptIcon size={22} style={{ color: 'var(--color-muted-2)', opacity: 0.7 }} />
                <span>Belum ada pengeluaran tercatat pada periode ini.</span>
              </div>
            ) : (
              <div
                className="card"
                style={{
                  padding: '16px',
                  display: 'grid',
                  gap: 14,
                }}
              >
                {/* Stacked 100% composition bar */}
                <div className="cost-stacked-bar" aria-hidden="true">
                  {costInsightItems.map((item) => (
                    <div
                      key={item.key}
                      style={{
                        width: `${item.pct}%`,
                        minWidth: 4,
                        background: item.color,
                      }}
                    />
                  ))}
                </div>

                {costInsightItems.map((item) => (
                  <div key={item.key}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: item.color,
                            flexShrink: 0,
                          }}
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
                          {item.pct.toFixed(0)}%
                        </span>
                        <span
                          className="font-mono-num"
                          style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)' }}
                        >
                          {formatRupiah(item.value)}
                        </span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.max(item.pct, 2)}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

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
                      Langsung <span className="font-mono-num">{formatRupiah(summary.totalDirectExpenses)}</span> &middot; Perawatan{' '}
                      <span className="font-mono-num">{formatRupiah(summary.totalMaintenanceExpenses)}</span>
                    </span>
                  </div>
                  <span
                    className="font-mono-num"
                    style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#b91c1c' }}
                  >
                    {formatCurrency(summary.totalExpenses)}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
