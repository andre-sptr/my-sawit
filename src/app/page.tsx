import Link from 'next/link'
import { SummaryCards } from '@/components/summary-cards'
import { MonthPicker } from '@/components/month-picker'
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

// Paksa halaman selalu di-render ulang di server setiap request
// agar data panen, pendapatan, dan laba selalu ter-update dari DB.
export const dynamic = 'force-dynamic'

/* ─── Helpers ─── */
function getGreeting(hour: number) {
  if (hour < 11) return { text: 'Selamat pagi', emoji: '☀️' }
  if (hour < 15) return { text: 'Selamat siang', emoji: '🌤️' }
  if (hour < 18) return { text: 'Selamat sore', emoji: '🌇' }
  return { text: 'Selamat malam', emoji: '🌙' }
}

function formatRupiah(value: number) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}jt`
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}rb`
  return formatCurrency(value)
}

const EXPENSE_PALETTE = ['#6366f1', '#0284c7', '#10b981', '#8b5cf6', '#ec4899', '#6b7280']

function expenseVisual(key: string, index: number) {
  if (key === 'GAJI_KARYAWAN') return { icon: '👷', color: '#6366f1' }
  if (key === 'LAIN_LAIN') return { icon: '📦', color: '#6b7280' }
  return { icon: '🧾', color: EXPENSE_PALETTE[index % EXPENSE_PALETTE.length] }
}

/* ─── Section Header ─── */
function SectionHead({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 id={id} style={{ margin: 0, fontSize: 'calc(15px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>
        {title}
      </h2>
      {sub && (
        <p style={{ margin: '2px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

/* ─── Main ─── */
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

  const greeting = getGreeting(getJakartaHour(now))
  const dayName = formatJakartaNow({ weekday: 'long' }, now)
  const dateLabel = formatJakartaNow({ day: 'numeric', month: 'long', year: 'numeric' }, now)
  const monthLabel = formatJakartaMonthYear(year, month)

  const isProfit = summary.netProfit >= 0
  const maxRevenue = Math.max(...kaplingStats.map((k) => k.revenue), 1)

  const costInsightItems = [
    ...expenseBreakdown.map((item, idx) => {
      const vis = expenseVisual(item.key, idx)
      return {
        key: item.key,
        label: item.label,
        value: item.amount,
        color: vis.color,
        icon: vis.icon,
        pct: summary.totalExpenses > 0 ? (item.amount / summary.totalExpenses) * 100 : 0,
      }
    }),
    {
      key: '__MAINT__',
      label: 'Biaya Perawatan Kebun',
      value: summary.totalMaintenanceExpenses,
      color: '#f59e0b',
      icon: '🔧',
      pct: summary.totalExpenses > 0 ? (summary.totalMaintenanceExpenses / summary.totalExpenses) * 100 : 0,
    },
  ]
  const maxCostItem = Math.max(...costInsightItems.map((i) => i.value), 1)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 56px' }}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <header style={{ marginBottom: 28 }} className="animate-fade-up">
        <div style={{
          background: 'linear-gradient(135deg, #0c1a10 0%, #1d3a26 60%, #16a34a22 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 22px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', right: -30, top: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(52,211,153,0.08)',
          }} />
          <div style={{
            position: 'absolute', right: 20, bottom: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(52,211,153,0.05)',
          }} />

          <div style={{ position: 'relative' }}>
            <p style={{ margin: '0 0 4px', fontSize: 'calc(13px * var(--text-scale, 1))', color: '#6ee7b7', fontWeight: 500 }}>
              {greeting.emoji} {greeting.text}
            </p>
            <h1 style={{ margin: '0 0 6px', fontSize: 'calc(22px * var(--text-scale, 1))', fontWeight: 800, lineHeight: 1.2, color: '#f0fdf4' }}>
              Dashboard Sawit
            </h1>
            <p style={{ margin: 0, fontSize: 'calc(12px * var(--text-scale, 1))', color: '#86efac' }}>
              {dayName}, {dateLabel}
            </p>

            {/* Quick stat chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 99, padding: '4px 10px',
                fontSize: 'calc(11px * var(--text-scale, 1))', fontWeight: 600, color: '#d1fae5',
              }}>
                🌴 {activeKaplings.length} Kapling Aktif
              </span>
              {inactiveCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(220,38,38,0.2)',
                  border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 99, padding: '4px 10px',
                  fontSize: 'calc(11px * var(--text-scale, 1))', fontWeight: 600, color: '#fca5a5',
                }}>
                  🚫 {inactiveCount} Nonaktif
                </span>
              )}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: isProfit ? 'rgba(34,197,94,0.2)' : 'rgba(220,38,38,0.2)',
                border: `1px solid ${isProfit ? 'rgba(34,197,94,0.3)' : 'rgba(220,38,38,0.3)'}`,
                borderRadius: 99, padding: '4px 10px',
                fontSize: 'calc(11px * var(--text-scale, 1))', fontWeight: 600,
                color: isProfit ? '#86efac' : '#fca5a5',
              }}>
                {isProfit ? '📈' : '📉'} {isProfit ? 'Laba' : 'Rugi'} {formatRupiah(Math.abs(summary.netProfit))}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── KPI SUMMARY CARDS ───────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <MonthPicker year={year} month={month} currentYear={currentParts.year} currentMonth={currentParts.month} />
        <SummaryCards summary={summary} isCurrentMonth={isCurrentMonth} monthLabel={monthLabel} />
      </section>

      {/* ── PERFORMA KAPLING ─────────────────────────────────── */}
      <section style={{ marginBottom: 28 }} aria-labelledby="kapling-perf-heading">
        <SectionHead
          id="kapling-perf-heading"
          title="Performa Kapling"
          sub={`Bulan ${monthLabel} — klik untuk kelola`}
        />
        {kaplingStats.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {kaplingStats.map((ks, i) => {
              const revPct = maxRevenue > 0 ? (ks.revenue / maxRevenue) * 100 : 0
              const isKProfit = ks.profit >= 0
              return (
                <Link
                  key={ks.kapling.id}
                  href={`/kapling/${ks.kapling.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s, transform 0.15s, border-color 0.2s',
                      animationDelay: `${i * 60}ms`,
                    }}
                    className="animate-fade-up card-hover"
                  >
                    {/* Row 1: Name + stats */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 'calc(14px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ks.kapling.name}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 'calc(11px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>
                          {ks.harvestCount} panen &middot; {ks.saleCount} penjualan
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700,
                          color: isKProfit ? 'var(--color-success)' : 'var(--color-danger)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {isKProfit ? '+' : ''}{formatRupiah(ks.profit)}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>laba bersih</p>
                      </div>
                    </div>

                    {/* Row 2: 3 mini stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Panen', value: ks.harvestKg > 0 ? formatKg(ks.harvestKg) : '—', color: '#16a34a' },
                        { label: 'Omset', value: ks.revenue > 0 ? formatRupiah(ks.revenue) : '—', color: '#92400e' },
                        { label: 'Biaya', value: ks.cost > 0 ? formatRupiah(ks.cost) : '—', color: '#dc2626' },
                      ].map((stat) => (
                        <div key={stat.label} style={{
                          background: 'var(--color-surface-2)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          textAlign: 'center',
                        }}>
                          <p style={{ margin: 0, fontSize: 'calc(9px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                          <p style={{ margin: '3px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Revenue progress bar */}
                    <div>
                      <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${revPct}%`,
                          background: isKProfit
                            ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                            : 'linear-gradient(90deg, #dc2626, #f87171)',
                          borderRadius: 99,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)', textAlign: 'right' }}>
                        {revPct.toFixed(0)}% dari kapling terbaik
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div style={{
            padding: '20px', borderRadius: 'var(--radius-md)',
            border: '1.5px dashed var(--color-border)',
            textAlign: 'center', color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))',
          }}>
            Belum ada kapling aktif. Tambah kapling dari sidebar.
          </div>
        )}
      </section>

      {/* ── AKTIVITAS TERBARU (FEED) ─────────────────────────── */}
      <section style={{ marginBottom: 28 }} aria-labelledby="feed-heading">
        <SectionHead
          id="feed-heading"
          title="Aktivitas Terbaru"
          sub={`Semua aktivitas bulan ${monthLabel}`}
        />
        {activityFeed.length === 0 ? (
          <div style={{
            padding: '20px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            textAlign: 'center', color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))',
          }}>
            Belum ada aktivitas pada periode ini.
          </div>
        ) : (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {activityFeed.map((item, i) => {
              const isLast = i === activityFeed.length - 1

              const meta = item.kind === 'harvest'
                ? { icon: '🌿', label: 'Panen', detail: formatKg(item.weightKg), detailColor: '#16a34a' }
                : item.kind === 'sale'
                  ? { icon: '💰', label: 'Penjualan', detail: formatRupiah(item.value), detailColor: '#92400e' }
                  : item.kind === 'expense'
                    ? { icon: '🧾', label: item.categoryLabel, detail: formatRupiah(item.amount), detailColor: '#dc2626' }
                    : (() => {
                        const typeColor: Record<string, string> = { SEMPROT: '#16a34a', BABAT: '#d97706', PUPUK: '#2563eb' }
                        return {
                          icon: '🔧',
                          label: item.typeLabel,
                          detail: item.cost != null ? formatRupiah(item.cost) : 'Perawatan',
                          detailColor: typeColor[item.type] ?? '#6b7280',
                        }
                      })()

              return (
                <Link
                  key={`${item.kind}-${item.kaplingId}-${item.date.getTime()}-${i}`}
                  href={`/kapling/${item.kaplingId}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="list-item-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 16px',
                      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}>
                    {/* Icon */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'calc(16px * var(--text-scale, 1))', flexShrink: 0,
                    }}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.kaplingName}
                        </span>
                        {!item.kaplingIsActive && (
                          <span style={{
                            fontSize: 'calc(9px * var(--text-scale, 1))', fontWeight: 700,
                            padding: '2px 5px', borderRadius: 4,
                            background: '#fef2f2', color: '#dc2626',
                            flexShrink: 0,
                          }}>
                            Nonaktif
                          </span>
                        )}
                        <span style={{
                          fontSize: 'calc(10px * var(--text-scale, 1))', fontWeight: 700,
                          padding: '2px 6px', borderRadius: 99,
                          background: 'var(--color-surface-2)',
                          color: 'var(--color-muted)',
                          flexShrink: 0,
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <p style={{ margin: '1px 0 0', fontSize: 'calc(11px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>
                        {formatDate(item.date)}
                      </p>
                    </div>

                    {/* Value */}
                    <span style={{
                      fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700,
                      color: meta.detailColor,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}>
                      {meta.detail}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── INSIGHT BIAYA ───────────────────────────────────── */}
      <section aria-labelledby="cost-insight-heading">
        <SectionHead
          id="cost-insight-heading"
          title="Insight Biaya"
          sub={isCurrentMonth ? 'Komposisi pengeluaran bulan ini' : `Komposisi pengeluaran ${monthLabel}`}
        />
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'grid',
          gap: 12,
        }}>
          {costInsightItems.map((item) => (
            <div key={item.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 'calc(14px * var(--text-scale, 1))' }}>{item.icon}</span>
                  <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 600, color: 'var(--color-ink)' }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 'calc(10px * var(--text-scale, 1))', fontWeight: 700,
                    padding: '2px 7px', borderRadius: 99,
                    background: item.color + '18', color: item.color,
                  }}>
                    {item.pct.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(item.value)}
                  </span>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${maxCostItem > 0 ? (item.value / maxCostItem) * 100 : 0}%`,
                  background: item.color, borderRadius: 99,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}

          <div style={{
            paddingTop: 12, borderTop: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>Total Pengeluaran</span>
            <span style={{ fontSize: 'calc(14px * var(--text-scale, 1))', fontWeight: 800, color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>
              {formatRupiah(summary.totalExpenses)}
            </span>
          </div>
        </div>
      </section>

    </div>
  )
}
