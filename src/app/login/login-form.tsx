'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction } from '@/app/login/actions'
import { AlertTriangleIcon, EyeIcon, EyeOffIcon } from '@/components/ui/icons'

function LoginSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{ width: '100%', minBlockSize: 44 }}
    >
      {pending ? 'Memeriksa…' : 'Masuk'}
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
          className="input-label"
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
    </form>
  )
}
