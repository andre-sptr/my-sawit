import type { Summary } from '@/lib/types'
import { formatCurrency, formatKg } from '@/lib/date'

interface StatCard {
  id: string
  label: string
  value: string
  icon: string
  accentColor: string
  accentBg: string
  subLabel?: string
}

export function SummaryCards({
  summary,
  isCurrentMonth = true,
  monthLabel = 'Bulan ini',
}: {
  summary: Summary
  isCurrentMonth?: boolean
  monthLabel?: string
}) {
  const isProfit = summary.netProfit >= 0
  const periodSub = isCurrentMonth ? 'Bulan ini' : monthLabel

  const cards: StatCard[] = [
    {
      id: 'total-harvest',
      label: 'Total Panen',
      value: formatKg(summary.totalHarvestKg),
      icon: '🌿',
      accentColor: '#16a34a',
      accentBg: '#dcfce7',
      subLabel: periodSub,
    },
    {
      id: 'total-revenue',
      label: 'Pendapatan',
      value: formatCurrency(summary.totalRevenue),
      icon: '💰',
      accentColor: '#f59e0b',
      accentBg: '#fef9c3',
      subLabel: 'Dari penjualan',
    },
    {
      id: 'total-expenses',
      label: 'Pengeluaran',
      value: formatCurrency(summary.totalExpenses),
      icon: '📋',
      accentColor: '#6b7280',
      accentBg: '#f3f4f6',
      subLabel: 'Operasional',
    },
    {
      id: 'net-profit',
      label: 'Laba Bersih',
      value: formatCurrency(summary.netProfit),
      icon: isProfit ? '📈' : '📉',
      accentColor: isProfit ? '#16a34a' : '#dc2626',
      accentBg: isProfit ? '#dcfce7' : '#fee2e2',
      subLabel: isProfit ? (isCurrentMonth ? 'Bulan berjalan' : 'Surplus') : 'Perlu perhatian',
    },
  ]

  return (
    <section
      aria-label={`Ringkasan statistik ${periodSub}`}
      className="grid-stats-4"
    >
      {cards.map((card, i) => (
        <div
          key={card.id}
          id={`stat-card-${card.id}`}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            boxShadow: 'var(--shadow-sm)',
            animationDelay: `${i * 60}ms`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            transition: 'box-shadow 0.2s, transform 0.15s',
          }}
          className="animate-fade-up card-hover"
        >
          {/* Icon + accent strip */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: card.accentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'calc(17px * var(--text-scale, 1))',
              flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div style={{
              fontSize: 'calc(9px * var(--text-scale, 1))',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: card.accentColor,
              background: card.accentBg,
              padding: '3px 7px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
            }}>
              {card.subLabel}
            </div>
          </div>

          {/* Value */}
          <div>
            <p style={{
              margin: 0,
              fontSize: 'calc(11px * var(--text-scale, 1))',
              fontWeight: 600,
              color: 'var(--color-muted)',
              letterSpacing: '0.02em',
              marginBottom: 4,
            }}>
              {card.label}
            </p>
            <p style={{
              margin: 0,
              fontSize: 'calc(16px * var(--text-scale, 1))',
              fontWeight: 700,
              color: card.id === 'net-profit' ? card.accentColor : 'var(--color-ink)',
              lineHeight: 1.2,
              fontFamily: 'var(--font-plus-jakarta), sans-serif',
              fontVariantNumeric: 'tabular-nums',
              wordBreak: 'break-all',
            }}>
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
