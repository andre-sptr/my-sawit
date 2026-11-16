import { redirect } from 'next/navigation'
import { isAuthenticated, isAuthEnabled } from '@/lib/auth'
import { LoginForm } from '@/app/login/login-form'

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="card animate-fade-up"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 'calc(12px * var(--text-scale, 1))',
              fontWeight: 700,
              color: 'var(--color-primary)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            REKAPAL
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 'calc(22px * var(--text-scale, 1))',
              fontWeight: 800,
              color: 'var(--color-ink)',
            }}
          >
            Masuk Dashboard
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 'calc(13px * var(--text-scale, 1))',
              color: 'var(--color-muted)',
            }}
          >
            Masukkan password akses untuk mengelola data kapling sawit.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
