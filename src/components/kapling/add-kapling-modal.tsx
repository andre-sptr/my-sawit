'use client'

import { useRef, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createKapling } from '@/app/actions'
import { AlertTriangleIcon, CloseIcon, PalmIcon } from '@/components/ui/icons'

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
      style={{ flex: 1, minBlockSize: 44 }}
    >
      {pending ? (
        <>
          <span
            className="animate-spin"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              border: '2px solid rgba(255,255,255,0.35)',
              borderTopColor: '#fff',
              borderRadius: '50%',
            }}
          />
          <span>Menyimpan…</span>
        </>
      ) : (
        'Tambah Kapling'
      )}
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
    <form ref={formRef} action={formAction} style={{ padding: '0 22px 22px' }}>
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="modal-kapling-name"
          className="input-label"
          style={{ marginBottom: 6 }}
        >
          Nama Kapling
        </label>
        <input
          ref={inputRef}
          id="modal-kapling-name"
          name="name"
          placeholder="Contoh: Blok A, Kapling 01…"
          maxLength={100}
          required
          autoFocus
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? 'modal-kapling-error' : undefined}
          className="input-field"
        />
      </div>

      {hasError && state && (
        <div
          id="modal-kapling-error"
          role="alert"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangleIcon size={15} style={{ flexShrink: 0 }} />
          <span>{state.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          style={{ flex: 1, minBlockSize: 44 }}
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
        className="card animate-scale-in"
        style={{
          width: '100%',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '20px 22px 0',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PalmIcon size={20} />
            </div>
            <div>
              <h2
                id="add-kapling-title"
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--color-ink)',
                }}
              >
                Tambah Kapling Baru
              </h2>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.8125rem',
                  color: 'var(--color-muted)',
                }}
              >
                Masukkan nama blok atau lahan sawit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 9,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {isOpen && (
          <AddKaplingForm onSuccess={onClose} onCancel={onClose} />
        )}
      </div>
    </dialog>
  )
}
