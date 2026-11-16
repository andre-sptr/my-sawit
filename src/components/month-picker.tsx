'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function MonthPicker({
  year,
  month,
  currentYear,
  currentMonth,
}: {
  year: number
  month: number
  currentYear: number
  currentMonth: number
}) {
  const router = useRouter()
  const pathname = usePathname()

  const isCurrentMonth = year === currentYear && month === currentMonth
  const isFuture = year > currentYear || (year === currentYear && month >= currentMonth)

  const navigate = useCallback((y: number, m: number) => {
    if (y === currentYear && m === currentMonth) {
      router.push(pathname)
    } else {
      router.push(`${pathname}?y=${y}&m=${m}`)
    }
  }, [router, pathname, currentYear, currentMonth])

  function goToPrev() {
    navigate(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)
  }

  function goToNext() {
    if (isFuture) return
    navigate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)
  }

  const label = `${monthNames[month - 1]} ${year}`

  const arrowBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'calc(12px * var(--text-scale, 1))',
    transition: 'background 0.15s, border-color 0.15s',
    padding: 0,
    lineHeight: 1,
  }

  const disabledArrow: React.CSSProperties = {
    ...arrowBtn,
    opacity: 0.3,
    cursor: 'not-allowed',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'calc(15px * var(--text-scale, 1))',
          fontWeight: 700,
          color: 'var(--color-ink)',
        }}>
          Ringkasan {label}
        </h2>
        <p style={{
          margin: '2px 0 0',
          fontSize: 'calc(12px * var(--text-scale, 1))',
          color: 'var(--color-muted)',
        }}>
          Data keuangan bulan {isCurrentMonth ? 'berjalan' : 'yang dipilih'}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          onClick={goToPrev}
          style={arrowBtn}
          aria-label="Bulan sebelumnya"
          className="card-hover"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={goToNext}
          style={isFuture ? disabledArrow : arrowBtn}
          aria-label="Bulan berikutnya"
          disabled={isFuture}
          className={isFuture ? undefined : 'card-hover'}
        >
          ▶
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            style={{
              padding: '5px 12px',
              borderRadius: 99,
              border: '1px solid rgba(22, 163, 74, 0.3)',
              background: 'rgba(22, 163, 74, 0.1)',
              color: '#16a34a',
              cursor: 'pointer',
              fontSize: 'calc(11px * var(--text-scale, 1))',
              fontWeight: 600,
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
            className="card-hover"
          >
            Hari Ini
          </button>
        )}
      </div>
    </div>
  )
}
