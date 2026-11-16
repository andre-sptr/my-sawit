'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CloseIcon, ExternalLinkIcon, PhotoIcon, TrashIcon } from '@/components/ui/icons'

interface PhotoUploadFieldProps {
  name?: string
  label?: string
  accept?: string
  hint?: string
}

interface SelectedPhotoMeta {
  url: string
  name: string
  sizeLabel: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PhotoUploadField({
  name = 'photo',
  label = 'Foto',
  accept = 'image/jpeg,image/png,image/webp,image/heic',
  hint = 'Opsional · JPG, PNG, WebP · maks. 5 MB',
}: PhotoUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<SelectedPhotoMeta | null>(null)

  useEffect(() => {
    const urlToRevoke = preview?.url
    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke)
      }
    }
  }, [preview])

  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const handleReset = () => {
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      setPreview(null)
    }
    form.addEventListener('reset', handleReset)
    form.addEventListener('rekapal:clear-photo', handleReset)
    return () => {
      form.removeEventListener('reset', handleReset)
      form.removeEventListener('rekapal:clear-photo', handleReset)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview({
      url: objectUrl,
      name: file.name,
      sizeLabel: formatBytes(file.size),
    })
  }

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setPreview(null)
  }

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <label htmlFor={inputId} className="input-label">
        <span>
          {label} <span className="field-hint">({hint})</span>
        </span>
      </label>

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="input-field"
        style={{ padding: '7px 10px' }}
      />

      {preview && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-tint)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt={`Pratinjau ${preview.name}`}
            style={{
              width: 48,
              height: 48,
              borderRadius: 6,
              objectFit: 'cover',
              border: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {preview.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Siap diunggah · {preview.sizeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary"
            aria-label="Hapus foto yang dipilih"
            style={{ minBlockSize: 34, padding: '4px 10px', fontSize: '0.75rem' }}
          >
            <TrashIcon size={13} />
            <span>Hapus</span>
          </button>
        </div>
      )}
    </div>
  )
}

interface PhotoLightboxButtonProps {
  src: string
  alt: string
  label?: string
  showThumbnail?: boolean
}

export function PhotoLightboxButton({ src, alt, label = 'Foto', showThumbnail = false }: PhotoLightboxButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pointerDownOutsideRef = useRef(false)
  const titleId = useId()

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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary"
        style={{
          minBlockSize: showThumbnail ? 38 : 32,
          padding: showThumbnail ? '4px 11px 4px 5px' : '4px 10px',
          fontSize: '0.75rem',
          background: 'var(--color-info-bg)',
          color: 'var(--color-info)',
          borderColor: '#bae6fd',
          gap: showThumbnail ? 8 : 6,
        }}
      >
        {showThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              objectFit: 'cover',
              border: '1px solid #bae6fd',
              flexShrink: 0,
            }}
          />
        ) : (
          <PhotoIcon size={14} />
        )}
        <span>{label}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="rekapal-lightbox"
        aria-labelledby={titleId}
        closedby="any"
        onClose={() => {
          if (isOpen) setIsOpen(false)
        }}
        onCancel={(e) => {
          e.preventDefault()
          setIsOpen(false)
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
            setIsOpen(false)
          }
        }}
      >
        {isOpen && (
          <div
            className="card animate-scale-in"
            style={{
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <span
                id={titleId}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {alt}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ minBlockSize: 34, padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                >
                  <ExternalLinkIcon size={13} />
                  <span>Tab Baru</span>
                </a>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup pratinjau foto"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>

            <div
              style={{
                background: '#0c1a10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75dvh',
                  objectFit: 'contain',
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
