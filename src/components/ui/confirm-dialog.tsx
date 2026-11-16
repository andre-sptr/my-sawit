'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangleIcon, CloseIcon, TrashIcon } from '@/components/ui/icons'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Ya, Hapus',
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pointerDownOutsideRef = useRef(false)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  const isOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement) => {
    const rect = dialog.getBoundingClientRect()
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
  }

  const iconPalette =
    tone === 'danger'
      ? { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'var(--color-danger-border)' }
      : tone === 'warning'
        ? { bg: 'var(--color-harvest-bg)', color: 'var(--color-harvest-ink)', border: '#fde68a' }
        : { bg: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', border: '#bbf7d0' }

  const confirmStyle: React.CSSProperties =
    tone === 'danger'
      ? {
          minBlockSize: 42,
          padding: '8px 18px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--color-danger)',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }
      : tone === 'warning'
        ? {
            minBlockSize: 42,
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: '#d97706',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }
        : {
            minBlockSize: 42,
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }

  return (
    <dialog
      ref={dialogRef}
      className="rekapal-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      closedby="any"
      onClose={() => {
        if (isOpen) onCancel()
      }}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onPointerDown={(e) => {
        const dialog = dialogRef.current
        if (!dialog) return
        pointerDownOutsideRef.current = e.target === dialog && isOutsideDialog(e, dialog)
      }}
      onPointerUp={(e) => {
        const dialog = dialogRef.current
        if (!dialog) return
        const startedOutside = pointerDownOutsideRef.current
        pointerDownOutsideRef.current = false
        if (startedOutside && e.target === dialog && isOutsideDialog(e, dialog)) {
          onCancel()
        }
      }}
    >
      {isOpen && (
        <div
          className="card animate-scale-in"
          style={{
            padding: '22px 22px 20px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: iconPalette.bg,
                  color: iconPalette.color,
                  border: `1px solid ${iconPalette.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tone === 'danger' ? <TrashIcon size={18} /> : <AlertTriangleIcon size={18} />}
              </div>
              <h2
                id={titleId}
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--color-ink)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onCancel}
              aria-label="Tutup konfirmasi"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <CloseIcon size={16} />
            </button>
          </div>

          <p
            id={descId}
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-ink-2)',
              margin: '0 0 20px',
              lineHeight: 1.55,
            }}
          >
            {description}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              autoFocus
              onClick={onCancel}
              className="btn-secondary"
              style={{ minBlockSize: 42, padding: '8px 16px' }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={confirmStyle}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}

interface ConfirmSubmitButtonProps {
  confirmTitle: string
  confirmMessage: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning' | 'primary'
  label: string
  pendingLabel?: string
  className?: string
  style?: React.CSSProperties
  icon?: React.ReactNode
}

export function ConfirmSubmitButton({
  confirmTitle,
  confirmMessage,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
  label,
  pendingLabel,
  className = 'btn-danger-outline',
  style,
  icon,
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false)
  const hiddenSubmitRef = useRef<HTMLButtonElement>(null)
  const { pending } = useFormStatus()

  const handleConfirm = () => {
    setOpen(false)
    const submitter = hiddenSubmitRef.current
    const form = submitter?.form
    if (form && submitter) {
      form.requestSubmit(submitter)
    } else if (form) {
      form.requestSubmit()
    }
  }

  return (
    <>
      <button ref={hiddenSubmitRef} type="submit" hidden aria-hidden="true" tabIndex={-1} />
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className={className}
        style={style}
      >
        {!pending && icon}
        <span>{pending ? (pendingLabel ?? 'Memproses…') : label}</span>
      </button>
      <ConfirmDialog
        isOpen={open}
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        tone={tone}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
