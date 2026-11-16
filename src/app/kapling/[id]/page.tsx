import { notFound } from 'next/navigation'
import { ActivityTabs } from '@/components/kapling/activity-tabs'
import { InactiveKaplingPage } from '@/components/kapling/inactive-page'
import { requirePageAuth } from '@/lib/auth'
import { getKaplingWorkspace } from '@/lib/sawit-data'

// Paksa halaman selalu di-render ulang di server setiap request
// agar data kapling selalu ter-update dari DB.
export const dynamic = 'force-dynamic'

export default async function KaplingPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAuth()
  const { id } = await params
  const data = await getKaplingWorkspace(id)

  if (!data) {
    notFound()
  }

  const { kapling, harvests, maintenance, expenses, sales, maintenanceTypeOptions, expenseCategoryOptions } = data

  // ── Kapling nonaktif: tampilkan halaman khusus ──
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

  // ── Kapling aktif: tampilkan halaman normal ──
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Kapling Header */}
      <header style={{ marginBottom: 24 }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h1 style={{
            margin: 0,
            fontSize: 'calc(26px * var(--text-scale, 1))',
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1.2,
            fontFamily: 'var(--font-plus-jakarta), sans-serif',
          }}>
            {kapling.name}
          </h1>
          <span className="badge badge-active">● Aktif</span>
        </div>
        <p style={{ margin: 0, fontSize: 'calc(13px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>
          Catat dan kelola semua aktivitas kapling ini dari satu tempat
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid-stats-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Panen', count: harvests.length, icon: '🌿', color: '#16a34a', bg: '#dcfce7' },
          { label: 'Perawatan', count: maintenance.length, icon: '🔧', color: '#d97706', bg: '#fef3c7' },
          { label: 'Pengeluaran', count: expenses.length, icon: '💸', color: '#dc2626', bg: '#fee2e2' },
          { label: 'Penjualan', count: sales.length, icon: '💰', color: '#92400e', bg: '#fef9c3' },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 8px',
              textAlign: 'center',
              animationDelay: `${i * 50}ms`,
            }}
            className="animate-fade-up"
          >
            <div style={{ fontSize: 'calc(18px * var(--text-scale, 1))', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 'calc(18px * var(--text-scale, 1))', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Activity Tabs */}
      <ActivityTabs
        kaplingId={kapling.id}
        kaplingName={kapling.name}
        isActive={kapling.isActive}
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
