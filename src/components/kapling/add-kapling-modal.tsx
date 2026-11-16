'use client'

import { useRef, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createKapling } from '@/app/actions'

function XIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function AddKaplingForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, formAction] = useActionState(createKapling, null)
  const hasError = Boolean(state && !state.ok)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      onSuccess()
    }
  }, [state, onSuccess])

  return (
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
          maxLength={100}
          required
          autoFocus
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? 'modal-kapling-error' : undefined}
          className="input-field"
          style={{ fontSize: 'calc(14px * var(--text-scale, 1))' }}
        />
      </div>

      {hasError && state && (
        <p
          id="modal-kapling-error"
          role="alert"
          aria-live="polite"
          style={{ margin: '0 0 10px', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-danger)', fontWeight: 600 }}
        >
          {state.message}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
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
  )
}

export function AddKaplingModal({ isOpen, onClose }: AddKaplingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  // Fallback light-dismiss untuk browser tanpa dukungan atribut HTML `closedby` (mis. Safari).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return

    let pressedOutside = false
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect()
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
    }
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        dialog.close()
      }
      pressedOutside = false
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointerup', onPointerUp)
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="rekapal-dialog"
      aria-labelledby="add-kapling-title"
      onClose={onClose}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div
        style={{
          width: '100%',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
        className="animate-scale-in"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 0',
          marginBottom: 20,
        }}>
          <div>
            <h2 id="add-kapling-title" style={{ margin: 0, fontSize: 'calc(17px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>
              Tambah Kapling Baru
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>
              Masukkan nama kapling kebun sawit
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
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

        {isOpen && (
          <AddKaplingForm onSuccess={onClose} onCancel={onClose} />
        )}
      </div>
    </dialog>
  )
}
