'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction } from '@/app/login/actions'

function LoginSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{ width: '100%', height: 44, fontSize: 'calc(14px * var(--text-scale, 1))' }}
    >
      {pending ? 'Memeriksa...' : 'Masuk'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const hasError = Boolean(state && !state.ok)

  return (
    <form action={formAction} style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <label
          htmlFor="login-password"
          style={{
            fontSize: 'calc(12px * var(--text-scale, 1))',
            fontWeight: 700,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Password Akses
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            enterKeyHint="done"
            required
            autoFocus
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'login-error' : undefined}
            className="input-field"
            placeholder="Masukkan password..."
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            style={{
              minWidth: 72,
              minHeight: 42,
              padding: '0 12px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-ink)',
              fontSize: 'calc(12px * var(--text-scale, 1))',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {showPassword ? 'Tutup' : 'Lihat'}
          </button>
        </div>
      </div>

      {hasError && state && (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          style={{
            margin: 0,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: 'calc(12px * var(--text-scale, 1))',
            fontWeight: 600,
          }}
        >
          {state.message}
        </p>
      )}

      <LoginSubmitButton />
    </form>
  )
}
