import type { ReactNode } from 'react'
import type { Summary } from '@/lib/types'
import { formatCurrency, formatKg } from '@/lib/date'
import { CoinsIcon, LeafIcon, ReceiptIcon, TrendingDownIcon, TrendingUpIcon } from '@/components/ui/icons'

interface StatCard {
  id: string
  label: string
  value: string
  icon: ReactNode
  accentColor: string
  badgeColor: string
  accentBg: string
  iconBorder: string
  subLabel: string
  featuredClass?: string
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

  const harvestBadge =
    summary.totalHarvestKg >= 1000
      ? `~${(summary.totalHarvestKg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ton`
      : periodSub

  const expenseBadge =
    summary.totalRevenue > 0
      ? `${Math.round((summary.totalExpenses / summary.totalRevenue) * 100)}% dr omset`
      : 'Operasional'

  const marginPct =
    summary.totalRevenue > 0 ? Math.round((summary.netProfit / summary.totalRevenue) * 100) : null

  const profitBadge =
    marginPct !== null
      ? `${marginPct >= 0 ? '+' : ''}${marginPct}% margin`
      : isProfit
        ? isCurrentMonth
          ? 'Berjalan'
          : 'Surplus'
        : 'Defisit'

  const cards: StatCard[] = [
    {
      id: 'total-harvest',
      label: 'Total Panen',
      value: formatKg(summary.totalHarvestKg),
      icon: <LeafIcon size={18} />,
      accentColor: '#166534',
      badgeColor: '#166534',
      accentBg: '#dcfce7',
      iconBorder: 'rgba(22, 163, 74, 0.22)',
      subLabel: harvestBadge,
    },
    {
      id: 'total-revenue',
      label: 'Pendapatan',
      value: formatCurrency(summary.totalRevenue),
      icon: <CoinsIcon size={18} />,
      accentColor: '#92400e',
      badgeColor: '#78350f',
      accentBg: '#fef3c7',
      iconBorder: 'rgba(217, 119, 6, 0.24)',
      subLabel: 'Penjualan TBS',
    },
    {
      id: 'total-expenses',
      label: 'Pengeluaran',
      value: formatCurrency(summary.totalExpenses),
      icon: <ReceiptIcon size={18} />,
      accentColor: '#334155',
      badgeColor: '#334155',
      accentBg: '#f1f5f9',
      iconBorder: 'rgba(100, 116, 139, 0.22)',
      subLabel: expenseBadge,
    },
    {
      id: 'net-profit',
      label: 'Laba Bersih',
      value: formatCurrency(summary.netProfit),
      icon: isProfit ? <TrendingUpIcon size={18} /> : <TrendingDownIcon size={18} />,
      accentColor: isProfit ? '#166534' : '#b91c1c',
      badgeColor: isProfit ? '#166534' : '#b91c1c',
      accentBg: isProfit ? '#dcfce7' : '#fee2e2',
      iconBorder: isProfit ? 'rgba(22, 163, 74, 0.28)' : 'rgba(220, 38, 38, 0.28)',
      subLabel: profitBadge,
      featuredClass: isProfit ? 'kpi-card-featured-profit' : 'kpi-card-featured-loss',
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
          style={{ animationDelay: `${i * 55}ms` }}
          className={`kpi-card animate-fade-up card-hover${card.featuredClass ? ` ${card.featuredClass}` : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: card.accentBg,
                border: `1px solid ${card.iconBorder}`,
                color: card.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <span
              className="font-mono-num"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
                color: card.badgeColor,
                background: card.accentBg,
                padding: '3px 8px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.subLabel}
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-muted)',
                letterSpacing: '0.01em',
              }}
            >
              {card.label}
            </p>
            <p
              className="font-mono-num kpi-value"
              style={{
                color: card.id === 'net-profit' ? card.accentColor : 'var(--color-ink)',
              }}
            >
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
