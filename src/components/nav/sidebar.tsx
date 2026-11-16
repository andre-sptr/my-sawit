'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './sidebar-provider'
import { logoutAction } from '@/app/login/actions'
import {
  ChevronDownIcon,
  CloseIcon,
  DashboardIcon,
  LeafIcon,
  LogOutIcon,
  PalmIcon,
  PlusIcon,
  SearchIcon,
} from '@/components/ui/icons'

interface Kapling {
  id: string
  name: string
  isActive: boolean
}

interface SidebarProps {
  kaplings: Kapling[]
  authEnabled: boolean
  onAddKapling: () => void
}

function SidebarContent({
  kaplings,
  authEnabled,
  onAddKapling,
  onNavigate,
  showCloseButton,
  onClose,
}: SidebarProps & {
  onNavigate?: () => void
  showCloseButton?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [inactiveExpanded, setInactiveExpanded] = useState(true)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredKaplings = normalizedQuery
    ? kaplings.filter((k) => k.name.toLowerCase().includes(normalizedQuery))
    : kaplings

  const activeKaplings = filteredKaplings.filter((k) => k.isActive)
  const inactiveKaplings = filteredKaplings.filter((k) => !k.isActive)
  const hasActiveInactiveRoute = inactiveKaplings.some((k) => pathname === `/kapling/${k.id}`)
  const showInactiveList = Boolean(normalizedQuery) || inactiveExpanded || hasActiveInactiveRoute

  const renderKaplingLink = (k: Kapling) => {
    const href = `/kapling/${k.id}`
    const isCurrent = pathname === href
    return (
      <Link
        key={k.id}
        href={href}
        onClick={onNavigate}
        className="sidebar-nav-link"
        data-active={isCurrent ? 'true' : undefined}
        style={{
          color: k.isActive || isCurrent ? undefined : 'var(--sidebar-text-muted)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            background: k.isActive ? '#34d399' : 'var(--sidebar-text-muted)',
            opacity: k.isActive ? 1 : 0.6,
            boxShadow: k.isActive ? '0 0 0 2px rgba(52, 211, 153, 0.22)' : 'none',
          }}
        />
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {k.name}
        </span>
      </Link>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '18px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
            }}
          >
            <PalmIcon size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-display"
              style={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#ecfdf5',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              REKAPAL
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--sidebar-text-muted)',
                fontWeight: 500,
              }}
            >
              Rekap Kebun Sawit
            </div>
          </div>
        </Link>

        {showCloseButton && onClose && (
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              border: '1px solid var(--sidebar-border)',
              background: 'var(--sidebar-bg-hover)',
              color: 'var(--sidebar-text-active)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      {/* Quick Filter */}
      <div
        style={{
          padding: '0 12px 12px',
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <div className="sidebar-search-box">
          <SearchIcon size={15} style={{ flexShrink: 0 }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kapling..."
            aria-label="Cari kapling"
            className="sidebar-search-input"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian kapling"
              className="sidebar-search-clear"
            >
              <CloseIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Nav Scroll Area */}
      <nav
        aria-label="Menu sidebar"
        className="sidebar-nav-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="sidebar-nav-link"
          data-active={pathname === '/' ? 'true' : undefined}
        >
          <span style={{ color: pathname === '/' ? 'var(--sidebar-accent)' : 'var(--sidebar-text-muted)', display: 'flex' }}>
            <DashboardIcon size={18} />
          </span>
          <span style={{ flex: 1 }}>Dashboard</span>
        </Link>

        {/* Kapling Section Header with Inline Add */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 6px 6px 10px',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--sidebar-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Daftar Kapling
            </span>
            <span
              className="font-mono-num"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--sidebar-text-muted)',
              }}
            >
              {normalizedQuery ? filteredKaplings.length : kaplings.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              onAddKapling()
            }}
            id="btn-add-kapling-sidebar"
            className="sidebar-add-btn"
            aria-label="Tambah Kapling Baru"
            title="Tambah Kapling Baru"
          >
            <PlusIcon size={15} />
          </button>
        </div>

        {kaplings.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              textAlign: 'center',
              color: 'var(--sidebar-text-muted)',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LeafIcon size={20} style={{ opacity: 0.65 }} />
            <span>Belum ada kapling.</span>
          </div>
        ) : filteredKaplings.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              textAlign: 'center',
              color: 'var(--sidebar-text-muted)',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>Tidak ada kapling yang cocok.</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                border: '1px solid var(--sidebar-border)',
                borderRadius: 8,
                background: 'var(--sidebar-bg-hover)',
                color: 'var(--sidebar-text)',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Reset pencarian
            </button>
          </div>
        ) : (
          <>
            {activeKaplings.map(renderKaplingLink)}

            {inactiveKaplings.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setInactiveExpanded((prev) => !prev)}
                  aria-expanded={showInactiveList}
                  aria-controls="sidebar-inactive-kaplings"
                  className="sidebar-collapse-btn"
                >
                  <span>Nonaktif ({inactiveKaplings.length})</span>
                  <ChevronDownIcon
                    size={15}
                    style={{
                      transform: showInactiveList ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </button>
                {showInactiveList && (
                  <div id="sidebar-inactive-kaplings">
                    {inactiveKaplings.map(renderKaplingLink)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Bottom Session Utility */}
      {authEnabled && (
        <div
          style={{
            padding: '10px',
            borderTop: '1px solid var(--sidebar-border)',
          }}
        >
          <form action={logoutAction}>
            <button type="submit" className="sidebar-logout-btn">
              <LogOutIcon size={16} />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ kaplings, authEnabled, onAddKapling }: SidebarProps) {
  const { isOpen, close } = useSidebar()
  const drawerRef = useRef<HTMLDialogElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const pointerDownOutsideRef = useRef(false)

  useEffect(() => {
    const dialog = drawerRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  const isOutsideAside = (target: EventTarget | null) => {
    if (!asideRef.current || !target) return false
    return !asideRef.current.contains(target as Node)
  }

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className="sidebar-desktop"
        aria-label="Navigasi utama"
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100dvh',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        <SidebarContent kaplings={kaplings} authEnabled={authEnabled} onAddKapling={onAddKapling} />
      </aside>

      {/* Mobile Drawer using native modal <dialog> */}
      <dialog
        ref={drawerRef}
        id="mobile-nav-drawer"
        className="mobile-drawer-dialog"
        aria-label="Menu navigasi"
        closedby="any"
        onClose={() => {
          if (isOpen) close()
        }}
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onPointerDown={(e) => {
          pointerDownOutsideRef.current = isOutsideAside(e.target)
        }}
        onPointerUp={(e) => {
          const startedOutside = pointerDownOutsideRef.current
          pointerDownOutsideRef.current = false
          if (startedOutside && isOutsideAside(e.target)) {
            close()
          }
        }}
      >
        <aside
          ref={asideRef}
          className={isOpen ? 'animate-slide-in' : undefined}
          style={{
            width: 280,
            maxWidth: '84vw',
            height: '100dvh',
            boxShadow: 'var(--shadow-sidebar)',
            flexShrink: 0,
          }}
        >
          <SidebarContent
            kaplings={kaplings}
            authEnabled={authEnabled}
            onAddKapling={onAddKapling}
            onNavigate={close}
            showCloseButton
            onClose={close}
          />
        </aside>
      </dialog>
    </>
  )
}
