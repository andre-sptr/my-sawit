'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './sidebar-provider'
import { MenuIcon, PalmIcon } from '@/components/ui/icons'

interface MobileTopBarKapling {
  id: string
  name: string
}

export function MobileTopBar({ kaplings = [] }: { kaplings?: MobileTopBarKapling[] }) {
  const { isOpen, toggle } = useSidebar()
  const pathname = usePathname()

  const activeKaplingId = pathname.startsWith('/kapling/') ? pathname.split('/')[2] : null
  const activeKapling = activeKaplingId ? kaplings.find((k) => k.id === activeKaplingId) : null

  return (
    <header
      className="mobile-only"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: 'var(--topbar-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 12px',
        alignItems: 'center',
        gap: 10,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        id="hamburger-menu-btn"
        aria-label={isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--color-ink)',
          flexShrink: 0,
        }}
      >
        <MenuIcon size={20} />
      </button>

      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: '#0c1a10',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <PalmIcon size={16} />
        </div>

        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="font-display"
            style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            REKAPAL
          </span>
          {activeKapling ? (
            <>
              <span style={{ color: 'var(--color-border-2)', fontSize: '0.875rem' }}>/</span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'var(--color-primary-dark)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeKapling.name}
              </span>
            </>
          ) : pathname === '/' ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-muted)',
                padding: '2px 8px',
                borderRadius: 99,
                background: 'var(--color-surface-tint)',
                border: '1px solid var(--color-border)',
              }}
            >
              Dashboard
            </span>
          ) : null}
        </div>
      </Link>
    </header>
  )
}
