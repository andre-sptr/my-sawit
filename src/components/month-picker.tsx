'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'

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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      {/* Title */}
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: '1.0625rem',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
          }}
        >
          Ringkasan {label}
        </h2>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
          }}
        >
          {isCurrentMonth ? 'Performa keuangan bulan berjalan' : 'Arsip catatan bulan yang dipilih'}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            style={{
              minBlockSize: 40,
              padding: '6px 13px',
              borderRadius: 99,
              border: '1px solid rgba(22, 163, 74, 0.35)',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary-dark)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
            }}
            className="card-hover"
          >
            <CalendarIcon size={14} />
            <span>Bulan Ini</span>
          </button>
        )}

        <div className="month-stepper" role="group" aria-label="Pilih periode bulan">
          <button
            type="button"
            onClick={goToPrev}
            className="month-stepper-btn"
            aria-label="Bulan sebelumnya"
            title="Bulan sebelumnya"
          >
            <ChevronLeftIcon size={17} />
          </button>

          <span className="month-stepper-label">
            <CalendarIcon size={14} style={{ color: 'var(--color-primary)' }} />
            <span>{label}</span>
          </span>

          <button
            type="button"
            onClick={goToNext}
            className="month-stepper-btn"
            aria-label="Bulan berikutnya"
            title={isFuture ? 'Belum ada data bulan mendatang' : 'Bulan berikutnya'}
            disabled={isFuture}
          >
            <ChevronRightIcon size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
