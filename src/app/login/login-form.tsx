'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction } from '@/app/login/actions'
import { AlertTriangleIcon, EyeIcon, EyeOffIcon, LockIcon } from '@/components/ui/icons'

function LoginSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{ width: '100%', minBlockSize: 46, fontSize: '0.9375rem' }}
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
          <span>Memeriksa…</span>
        </>
      ) : (
        'Masuk ke Dashboard'
      )}
    </button>
  )
}

export function LoginForm({ autoFocusUsername = false }: { autoFocusUsername?: boolean }) {
  const [state, formAction] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const hasError = Boolean(state && !state.ok)

  return (
    <form action={formAction} style={{ display: 'grid', gap: 15 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="login-username" className="input-label">
          Username
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          required
          autoFocus={autoFocusUsername}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? 'login-error' : undefined}
          className="input-field"
          placeholder="Masukkan username…"
        />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="login-password" className="input-label">
          Password
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            enterKeyHint="done"
            required
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'login-error' : undefined}
            className="input-field"
            placeholder="Masukkan password…"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            className="btn-secondary"
            style={{
              minWidth: 44,
              minBlockSize: 44,
              padding: '0 12px',
              flexShrink: 0,
            }}
          >
            {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </div>
      </div>

      {hasError && state && (
        <div
          id="login-error"
          role="alert"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangleIcon size={16} style={{ flexShrink: 0 }} />
          <span>{state.message}</span>
        </div>
      )}

      <LoginSubmitButton />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
          textAlign: 'center',
          paddingTop: 2,
        }}
      >
        <LockIcon size={13} style={{ flexShrink: 0, color: 'var(--color-primary-dark)' }} />
        <span>Sesi permanen aktif hingga Anda keluar · Akses pribadi</span>
      </div>
    </form>
  )
}
