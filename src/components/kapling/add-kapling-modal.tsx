'use client'

import { useRef, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createKapling } from '@/app/actions'

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

interface AddKaplingModalProps {
  isOpen: boolean
  onClose: () => void
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{ flex: 1, height: 42 }}
    >
      {pending ? (
        <><span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Menyimpan...</>
      ) : 'Tambah Kapling'}
    </button>
  )
}

export function AddKaplingModal({ isOpen, onClose }: AddKaplingModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, formAction] = useActionState(createKapling, null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (isOpen && state?.ok) {
      formRef.current?.reset()
      onClose()
    }
  }, [isOpen, state, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
        }}
        className="animate-fade-in"
      />

      {/* Dialog */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
        className="animate-scale-in"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 0',
          marginBottom: 20,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'calc(17px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>Tambah Kapling Baru</h2>
            <p style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>Masukkan nama kapling kebun sawit</p>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)', color: 'var(--color-muted)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <XIcon />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} action={formAction} style={{ padding: '0 20px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="modal-kapling-name" style={{
              display: 'block',
              fontSize: 'calc(11px * var(--text-scale, 1))',
              fontWeight: 700,
              color: 'var(--color-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Nama Kapling
            </label>
            <input
              ref={inputRef}
              id="modal-kapling-name"
              name="name"
              placeholder="Contoh: Blok A, Kapling 01..."
              required
              className="input-field"
              style={{ fontSize: 'calc(14px * var(--text-scale, 1))' }}
            />
          </div>

          {state && !state.ok && (
            <p style={{ margin: '0 0 10px', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-danger)', fontWeight: 600 }}>{state.message}</p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, height: 42, borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-muted)', fontWeight: 600, fontSize: 'calc(13px * var(--text-scale, 1))',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              Batal
            </button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}
