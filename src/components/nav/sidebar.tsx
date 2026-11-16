'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Kapling } from '@prisma/client'
import { logoutAction } from '@/app/login/actions'
import { useSidebar } from '@/components/nav/sidebar-provider'

function PalmIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21V12M12 12C12 12 8 10 6 6C10 6 12 9 12 12ZM12 12C12 12 16 10 18 6C14 6 12 9 12 12Z" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12C12 12 9 8 9 4C11.5 5 12 9 12 12Z" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21H15" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 4 13c0-4.08 3.05-7 7-7 3.4 0 6.3 2.16 7 5.5-.5 2.5-2 5-7 8.5z"/>
      <path d="M15 12c-3 3-5 5-9 7"/>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}

interface SidebarProps {
  kaplings: Kapling[]
  authEnabled: boolean
  onAddKapling: () => void
}

function SidebarContent({ kaplings, authEnabled, onAddKapling }: SidebarProps) {
  const pathname = usePathname()
  const { close } = useSidebar()

  const isDashboard = pathname === '/'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(52,211,153,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <PalmIcon />
        </div>
        <div>
          <div style={{ color: '#f0fdf4', fontWeight: 700, fontSize: 'calc(15px * var(--text-scale, 1))', lineHeight: 1.2 }}>REKAPAL</div>
          <div style={{ color: 'var(--sidebar-text-muted)', fontSize: 'calc(11px * var(--text-scale, 1))' }}>Rekapan Kapling</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {/* Dashboard Link */}
        <Link
          href="/"
          onClick={close}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: 9,
            marginBottom: 2,
            textDecoration: 'none',
            background: isDashboard ? 'var(--sidebar-bg-active)' : 'transparent',
            color: isDashboard ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
            fontSize: 'calc(13px * var(--text-scale, 1))',
            fontWeight: isDashboard ? 600 : 500,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { if (!isDashboard) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-bg-hover)' }}
          onMouseLeave={(e) => { if (!isDashboard) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span style={{ opacity: isDashboard ? 1 : 0.7, flexShrink: 0 }}><DashboardIcon /></span>
          Dashboard
          {isDashboard && (
            <span style={{
              marginLeft: 'auto',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--sidebar-accent)',
              flexShrink: 0,
            }} />
          )}
        </Link>

        {/* Kapling Section */}
        <div style={{
          margin: '16px 0 6px 12px',
          fontSize: 'calc(10px * var(--text-scale, 1))',
          fontWeight: 700,
          color: 'var(--sidebar-text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Kapling Saya
        </div>

        {kaplings.length === 0 && (
          <div style={{ padding: '8px 12px', color: 'var(--sidebar-text-muted)', fontSize: 'calc(12px * var(--text-scale, 1))' }}>
            Belum ada kapling
          </div>
        )}

        {kaplings.map((kapling) => {
          const isActive = pathname === `/kapling/${kapling.id}`
          return (
            <Link
              key={kapling.id}
              href={`/kapling/${kapling.id}`}
              onClick={close}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 9,
                marginBottom: 1,
                textDecoration: 'none',
                background: isActive ? 'var(--sidebar-bg-active)' : 'transparent',
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                fontSize: 'calc(13px * var(--text-scale, 1))',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
                position: 'relative',
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-bg-hover)' }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  height: '60%',
                  width: 3,
                  borderRadius: '0 3px 3px 0',
                  background: 'var(--sidebar-accent)',
                }} />
              )}
              <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6, color: isActive ? 'var(--sidebar-accent)' : 'currentColor' }}>
                <LeafIcon />
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {kapling.name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {!kapling.isActive && (
                  <span style={{
                    fontSize: 'calc(9px * var(--text-scale, 1))',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: 4,
                    background: 'rgba(220,38,38,0.15)',
                    color: '#f87171',
                    letterSpacing: '0.04em',
                  }}>
                    OFF
                  </span>
                )}
                <span style={{ opacity: 0.4 }}><ChevronRightIcon /></span>
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 10px 16px',
        borderTop: '1px solid var(--sidebar-border)',
        display: 'grid',
        gap: 8,
      }}>
        <button
          type="button"
          onClick={onAddKapling}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 16px',
            borderRadius: 10,
            border: '1.5px dashed rgba(52,211,153,0.3)',
            background: 'transparent',
            color: 'var(--sidebar-accent)',
            fontSize: 'calc(13px * var(--text-scale, 1))',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.08)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.6)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.3)'
          }}
        >
          <PlusIcon />
          Tambah Kapling
        </button>
        {authEnabled && (
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid var(--sidebar-border)',
                background: 'transparent',
                color: 'var(--sidebar-text)',
                fontSize: 'calc(12px * var(--text-scale, 1))',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Keluar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const { isOpen, close } = useSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: 'var(--shadow-sidebar)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      className="sidebar-desktop"
      >
        <SidebarContent {...props} />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
          }}
          className="mobile-only"
        >
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
            }}
            className="animate-fade-in"
          />
          {/* Drawer */}
          <aside
            style={{
              position: 'relative',
              width: 'min(var(--sidebar-width), 80vw)',
              background: 'var(--sidebar-bg)',
              borderRight: '1px solid var(--sidebar-border)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
            className="animate-slide-in"
          >
            <SidebarContent {...props} />
          </aside>
        </div>
      )}
    </>
  )
}
