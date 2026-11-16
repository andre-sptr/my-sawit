'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { reactivateKapling, deleteKaplingPermanent } from '@/app/actions'
import { ConfirmSubmitButton } from '@/components/ui/confirm-dialog'
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  CoinsIcon,
  LeafIcon,
  ReceiptIcon,
  TrashIcon,
  WrenchIcon,
  XCircleIcon,
} from '@/components/ui/icons'

function ReactivateBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{
        width: '100%',
        minBlockSize: 48,
        fontSize: '0.9375rem',
        fontWeight: 700,
      }}
    >
      {pending ? (
        <>
          <span
            className="animate-spin"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 15,
              height: 15,
              border: '2px solid rgba(255,255,255,0.35)',
              borderTopColor: '#fff',
              borderRadius: '50%',
            }}
          />
          <span>Mengaktifkan…</span>
        </>
      ) : (
        <>
          <CheckCircleIcon size={18} />
          <span>Aktifkan Kembali</span>
        </>
      )}
    </button>
  )
}

interface InactiveKaplingPageProps {
  kaplingId: string
  kaplingName: string
  harvestCount: number
  maintenanceCount: number
  expenseCount: number
  saleCount: number
}

export function InactiveKaplingPage({
  kaplingId,
  kaplingName,
  harvestCount,
  maintenanceCount,
  expenseCount,
  saleCount,
}: InactiveKaplingPageProps) {
  const router = useRouter()
  const [reactivateState, reactivateAction] = useActionState(reactivateKapling, null)
  const [deleteState, deleteAction] = useActionState(deleteKaplingPermanent, null)

  const totalRecords = harvestCount + maintenanceCount + expenseCount + saleCount

  useEffect(() => {
    if (deleteState?.ok) {
      router.push('/')
      router.refresh()
    }
  }, [deleteState, router])

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '24px 16px 64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <nav aria-label="Breadcrumb" className="breadcrumb-nav" style={{ width: '100%', marginBottom: 4 }}>
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
          }}
        >
          {kaplingName}
        </span>
      </nav>

      {/* Status Card */}
      <div
        className="card animate-fade-up"
        style={{
          width: '100%',
          padding: '26px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'var(--color-danger-bg)',
            border: '2px solid var(--color-danger-border)',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="animate-scale-in"
        >
          <BanIcon size={30} />
        </div>

        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 99,
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: 10,
            }}
          >
            NONAKTIF
          </div>
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
              lineHeight: 1.2,
            }}
          >
            {kaplingName}
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-muted)',
              lineHeight: 1.55,
              maxWidth: 420,
            }}
          >
            Kapling ini sedang dinonaktifkan dan tidak menerima catatan aktivitas baru.
            Aktifkan kembali untuk melanjutkan pencatatan, atau hapus permanen.
          </p>
        </div>
      </div>

      {/* Data Summary */}
      {totalRecords > 0 && (
        <div
          className="card animate-fade-up"
          style={{
            width: '100%',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Data Tersimpan
            </p>
            <span
              className="font-mono-num"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-ink-2)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              {totalRecords} catatan
            </span>
          </div>
          <div className="grid-stats-4">
            {[
              { label: 'Panen', count: harvestCount, icon: <LeafIcon size={17} />, color: '#166534', bg: '#dcfce7' },
              { label: 'Perawatan', count: maintenanceCount, icon: <WrenchIcon size={17} />, color: '#075985', bg: '#e0f2fe' },
              { label: 'Pengeluaran', count: expenseCount, icon: <ReceiptIcon size={17} />, color: '#b91c1c', bg: '#fee2e2' },
              { label: 'Penjualan', count: saleCount, icon: <CoinsIcon size={17} />, color: '#78350f', bg: '#fef3c7' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  textAlign: 'center',
                  padding: '10px 6px',
                  borderRadius: 10,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    margin: '0 auto 6px',
                    borderRadius: 9,
                    background: item.bg,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </div>
                <div
                  className="font-mono-num"
                  style={{ fontSize: '1.05rem', fontWeight: 700, color: item.color }}
                >
                  {item.count}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 2 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Messages */}
      {reactivateState?.ok && (
        <div
          role="status"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircleIcon size={18} style={{ flexShrink: 0 }} />
          <span>{reactivateState.message}</span>
        </div>
      )}

      {reactivateState && !reactivateState.ok && (
        <div
          role="alert"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <XCircleIcon size={18} style={{ flexShrink: 0 }} />
          <span>{reactivateState.message}</span>
        </div>
      )}

      {deleteState && !deleteState.ok && (
        <div
          role="alert"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <XCircleIcon size={18} style={{ flexShrink: 0 }} />
          <span>{deleteState.message}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ width: '100%', display: 'grid', gap: 12 }} className="animate-fade-up">
        <form action={reactivateAction}>
          <input type="hidden" name="id" value={kaplingId} />
          <ReactivateBtn />
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--color-muted)',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span>atau</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form action={deleteAction}>
          <input type="hidden" name="id" value={kaplingId} />
          <ConfirmSubmitButton
            confirmTitle="Hapus Kapling Permanen?"
            confirmMessage={`Semua ${totalRecords} catatan historis (panen, perawatan, pengeluaran, dan penjualan) pada kapling "${kaplingName}" akan dihapus permanen dan tidak dapat dikembalikan.`}
            confirmLabel="Ya, Hapus Permanen"
            tone="danger"
            label="Hapus Permanen"
            pendingLabel="Menghapus…"
            icon={<TrashIcon size={17} />}
            className="btn-danger-outline"
            style={{ width: '100%', minBlockSize: 48, fontSize: '0.9375rem', borderRadius: 12 }}
          />
        </form>

        {totalRecords > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: 6,
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            <AlertTriangleIcon size={14} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
            <span>
              Hapus permanen akan menghapus <strong>{totalRecords} catatan</strong> historis selamanya.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
