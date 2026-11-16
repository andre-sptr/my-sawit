import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAuthenticated, isAuthEnabled } from '@/lib/auth'
import { LoginForm } from '@/app/login/login-form'
import { ChevronLeftIcon, PalmIcon } from '@/components/ui/icons'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (!isAuthEnabled() || (await isAuthenticated())) {
    redirect('/')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at top right, rgba(22, 163, 74, 0.14), transparent 45%), var(--color-canvas)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 14 }}>
          <Link href="/" className="breadcrumb-link">
            <ChevronLeftIcon size={14} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        <div
          className="card animate-fade-up"
          style={{
            width: '100%',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0c1a10 0%, #152b1c 58%, #1d3a26 100%)',
              padding: '22px 24px 20px',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
                  flexShrink: 0,
                }}
              >
                <PalmIcon size={22} />
              </div>
              <div>
                <p
                  className="font-display"
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#ecfdf5',
                    letterSpacing: '-0.01em',
                  }}
                >
                  REKAPAL
                </p>
                <p
                  style={{
                    margin: '1px 0 0',
                    fontSize: '0.75rem',
                    color: '#86efac',
                    fontWeight: 500,
                  }}
                >
                  Rekap Kebun Sawit
                </p>
              </div>
            </div>

            <h1
              className="font-display"
              style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: 700,
                color: '#f0fdf4',
                lineHeight: 1.2,
              }}
            >
              Masuk Dashboard
            </h1>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.8125rem',
                color: '#a7f3d0',
                lineHeight: 1.45,
              }}
            >
              Masukkan username dan password akses pribadi untuk mengelola data kapling sawit.
            </p>
          </div>

          <div style={{ padding: 24 }}>
            <LoginForm autoFocusUsername />
          </div>
        </div>
      </div>
    </div>
  )
}
