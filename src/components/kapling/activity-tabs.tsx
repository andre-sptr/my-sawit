'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import type { Expense, Harvest, Maintenance, Sale } from '@prisma/client'
import {
  addDropdownOption,
  createExpense,
  createHarvest,
  createMaintenance,
  createSale,
  deactivateKapling,
  deleteExpense,
  deleteHarvest,
  deleteMaintenance,
  deleteSale,
  updateExpense,
  updateHarvest,
  updateKapling,
  updateMaintenance,
  updateSale,
} from '@/app/actions'
import { formatCurrency, formatDate, formatKg, toDateInputValue } from '@/lib/date'
import { mergeOptions, type ActionResult, type DropdownItem } from '@/lib/types'
import {
  computeSaleTotalPreview,
  extractMonthOptions,
  filterActivityRecords,
  type KaplingTabId,
} from '@/lib/kapling-ui'
import { ConfirmSubmitButton } from '@/components/ui/confirm-dialog'
import { PhotoLightboxButton, PhotoUploadField } from '@/components/ui/photo-preview'
import { KaplingReport } from '@/components/kapling/kapling-report'
import {
  AlertTriangleIcon,
  BanIcon,
  BarChartIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CloseIcon,
  CoinsIcon,
  EditIcon,
  LeafIcon,
  PalmIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
  WrenchIcon,
  XCircleIcon,
} from '@/components/ui/icons'

type SAction = (_prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>

const inputCls = 'input-field'

/* ─── Submit Button ─── */
function SubmitBtn({ label, pendingLabel }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary" style={{ width: '100%', minBlockSize: 44 }}>
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
          <span>{pendingLabel || 'Menyimpan…'}</span>
        </>
      ) : (
        label
      )}
    </button>
  )
}

/* ─── Explicit Accessible Field Wrapper ─── */
function LabeledField({
  htmlFor,
  label,
  hint,
  fullWidth,
  children,
}: {
  htmlFor: string
  label: string
  hint?: string
  fullWidth?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label htmlFor={htmlFor} className="input-label">
        <span>
          {label}
          {hint ? <span className="field-hint"> ({hint})</span> : null}
        </span>
      </label>
      {children}
    </div>
  )
}

/* ─── Action Result Message ─── */
function ActionMsg({ state }: { state: ActionResult | null }) {
  if (!state) return null
  return (
    <div
      role={state.ok ? 'status' : 'alert'}
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: state.ok ? 'var(--color-success)' : 'var(--color-danger)',
        padding: '9px 12px',
        borderRadius: 'var(--radius-sm)',
        background: state.ok ? '#f0fdf4' : 'var(--color-danger-bg)',
        border: `1px solid ${state.ok ? '#bbf7d0' : 'var(--color-danger-border)'}`,
      }}
    >
      {state.ok ? <CheckCircleIcon size={16} style={{ flexShrink: 0 }} /> : <XCircleIcon size={16} style={{ flexShrink: 0 }} />}
      <span>{state.message}</span>
    </div>
  )
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid-form"
      style={{
        background: 'var(--color-surface-tint)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Creatable Select ─── */
function CreatableSelect({
  inputId,
  name,
  kaplingId,
  items,
  group,
  defaultValue,
  onOptionAdded,
}: {
  inputId: string
  name: string
  kaplingId: string
  items: DropdownItem[]
  group: string
  defaultValue?: string
  onOptionAdded: (item: DropdownItem) => void
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedValue, setSelectedValue] = useState(defaultValue || items[0]?.value || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  const handleAdd = async () => {
    const label = newLabel.trim()
    if (!label) return
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.set('group', group)
    fd.set('label', label)
    fd.set('kaplingId', kaplingId)
    const result = await addDropdownOption(null, fd)
    setSaving(false)
    if (result.ok) {
      const value = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
      const newItem = { value, label }
      onOptionAdded(newItem)
      setSelectedValue(value)
      setNewLabel('')
      setAdding(false)
      router.refresh()
    } else {
      setError(result.message)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <input type="hidden" name={name} value={selectedValue} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          id={inputId}
          className={inputCls}
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          style={{ flex: 1 }}
        >
          {items.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          title="Tambah opsi baru"
          aria-label={adding ? 'Tutup form tambah opsi' : 'Tambah opsi baru'}
          aria-expanded={adding}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
            border: '1.5px solid var(--color-border-2)',
            background: adding ? 'var(--color-primary)' : 'var(--color-surface)',
            color: adding ? '#fff' : 'var(--color-primary-dark)',
            cursor: 'pointer',
          }}
        >
          {adding ? <CloseIcon size={16} /> : <PlusIcon size={16} />}
        </button>
      </div>
      {adding && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="animate-fade-up">
          <input
            ref={inputRef}
            className={inputCls}
            type="text"
            aria-label="Nama opsi baru"
            placeholder="Nama opsi baru…"
            maxLength={60}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleAdd()
              }
            }}
            style={{ flex: 1 }}
            disabled={saving}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newLabel.trim()}
            className="btn-primary"
            style={{ minBlockSize: 44, padding: '0 14px', flexShrink: 0 }}
          >
            {saving ? '…' : 'Tambah'}
          </button>
        </div>
      )}
      {error && (
        <p aria-live="polite" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>
          {error}
        </p>
      )}
    </div>
  )
}

/* ─── Collapsible Add Form ─── */
function AddFormSection({
  title,
  subtitle,
  action,
  resetOnSuccess = true,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  title: string
  subtitle?: string
  action: SAction
  resetOnSuccess?: boolean
  open?: boolean
  onOpenChange?: (nextOpen: boolean) => void
  children: (defaultToday: string) => React.ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next)
    }
    onOpenChange?.(next)
  }

  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)
  const toggleId = `add-form-toggle-${title.replace(/\s+/g, '-').toLowerCase()}`

  useEffect(() => {
    if (state?.ok && resetOnSuccess) {
      formRef.current?.reset()
    }
  }, [state, resetOnSuccess])

  return (
    <div
      className="card"
      style={{ overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minBlockSize: 50,
          padding: '12px 16px',
          background: open ? 'var(--color-surface-tint)' : 'var(--color-surface)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: open ? 'var(--color-primary-dark)' : 'var(--color-ink)',
          gap: 10,
          textAlign: 'left',
        }}
        id={toggleId}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: open ? 'var(--color-primary)' : 'var(--color-primary-light)',
              color: open ? '#fff' : 'var(--color-primary-dark)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PlusIcon size={16} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', lineHeight: 1.25 }}>{title}</span>
            {subtitle && (
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  marginTop: 2,
                }}
              >
                {subtitle}
              </span>
            )}
          </span>
        </span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex', flexShrink: 0 }}>
          <ChevronDownIcon size={18} />
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)' }} className="animate-fade-up">
          <form ref={formRef} action={formAction} aria-labelledby={toggleId}>
            {children(toDateInputValue(new Date()))}
            {state && (
              <div style={{ padding: '0 16px 16px' }}>
                <ActionMsg state={state} />
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

/* ─── Edit Form Wrapper ─── */
function EditForm({
  action,
  onCancel,
  submitLabel,
  children,
}: {
  action: SAction
  onCancel: () => void
  submitLabel: string
  children: React.ReactNode
}) {
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state?.ok || !formRef.current) return
    formRef.current.dispatchEvent(new Event('rekapal:clear-photo'))
    const removeCheckbox = formRef.current.querySelector<HTMLInputElement>('input[name="removePhoto"]')
    if (removeCheckbox) removeCheckbox.checked = false
  }, [state])

  return (
    <form ref={formRef} action={formAction}>
      <FormGrid>
        {children}
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            style={{ minBlockSize: 44, padding: '8px 16px' }}
          >
            Batal
          </button>
          <div style={{ flex: '1 1 180px' }}>
            <SubmitBtn label={submitLabel} />
          </div>
        </div>
      </FormGrid>
      {state && (
        <div style={{ marginTop: 10 }}>
          <ActionMsg state={state} />
        </div>
      )}
    </form>
  )
}

function RemovePhotoCheckbox() {
  const checkboxId = useId()
  return (
    <label
      htmlFor={checkboxId}
      style={{
        gridColumn: '1 / -1',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'var(--color-muted)',
        cursor: 'pointer',
      }}
    >
      <input id={checkboxId} type="checkbox" name="removePhoto" value="1" />
      <span>Hapus foto saat ini</span>
    </label>
  )
}

/* ─── Inline Edit + Confirm Dialog Delete Actions ─── */
function ItemActions({
  renderEdit,
  deleteAction,
  deleteHiddenFields,
  confirmTitle,
  confirmMessage,
}: {
  renderEdit: (closeEdit: () => void) => React.ReactNode
  deleteAction: SAction
  deleteHiddenFields: { [key: string]: string }
  confirmTitle: string
  confirmMessage: string
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteState, deleteFormAction] = useActionState(deleteAction, null)

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setEditOpen((v) => !v)}
          className="btn-secondary"
          aria-expanded={editOpen}
          style={{ minBlockSize: 38, padding: '5px 12px' }}
        >
          <EditIcon size={14} />
          <span>{editOpen ? 'Tutup Edit' : 'Edit'}</span>
        </button>

        <form action={deleteFormAction} style={{ display: 'inline' }}>
          {Object.entries(deleteHiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <ConfirmSubmitButton
            confirmTitle={confirmTitle}
            confirmMessage={confirmMessage}
            confirmLabel="Ya, Hapus"
            tone="danger"
            label="Hapus"
            pendingLabel="Menghapus…"
            icon={<TrashIcon size={14} />}
          />
        </form>

        {deleteState && !deleteState.ok && (
          <span role="alert" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-danger)' }}>
            {deleteState.message}
          </span>
        )}
      </div>

      {editOpen && (
        <div style={{ marginTop: 12 }} className="animate-fade-up">
          {renderEdit(() => setEditOpen(false))}
        </div>
      )}
    </div>
  )
}

function EmptyFilteredState({ onReset }: { onReset: () => void }) {
  return (
    <div className="card" style={{ padding: '26px 18px', textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)' }}>
        Tidak ada catatan yang cocok dengan pencarian atau bulan yang dipilih.
      </p>
      <button type="button" onClick={onReset} className="btn-secondary">
        Tampilkan Semua
      </button>
    </div>
  )
}

/* ─────────────── HARVEST TAB ─────────────── */
function formatTonLabel(kg: number): string {
  return `~${(kg / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`
}

function HarvestWeightField({ defaultValue }: { defaultValue?: number }) {
  const weightId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const initialStr = defaultValue !== undefined ? String(defaultValue) : ''
  const [weightStr, setWeightStr] = useState(initialStr)

  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const handleReset = () => setWeightStr(initialStr)
    form.addEventListener('reset', handleReset)
    return () => form.removeEventListener('reset', handleReset)
  }, [initialStr])

  const parsedWeight = Number(weightStr)
  const showTonHint = Number.isFinite(parsedWeight) && parsedWeight >= 100

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <label htmlFor={weightId} className="input-label">
          <span>Berat (kg)</span>
        </label>
        {showTonHint && (
          <span
            className="font-mono-num"
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: '#166534',
              background: '#dcfce7',
              padding: '2px 7px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
            }}
          >
            {formatTonLabel(parsedWeight)}
          </span>
        )}
      </div>
      <div className="input-unit-wrap">
        <input
          ref={inputRef}
          id={weightId}
          className={inputCls}
          type="number"
          inputMode="decimal"
          enterKeyHint="next"
          step="0.01"
          min="0.01"
          name="weightKg"
          defaultValue={defaultValue}
          onChange={(e) => setWeightStr(e.target.value)}
          placeholder="Contoh: 1250"
          required
        />
        <span className="input-unit-badge" aria-hidden="true">
          kg
        </span>
      </div>
    </div>
  )
}

function HarvestCreateFields({ kaplingId, defaultDate }: { kaplingId: string; defaultDate: string }) {
  const dateId = useId()
  const noteId = useId()

  return (
    <FormGrid>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <LabeledField htmlFor={dateId} label="Tanggal Panen">
        <input id={dateId} className={inputCls} type="date" name="harvestDate" defaultValue={defaultDate} required />
      </LabeledField>
      <HarvestWeightField />
      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField />
      </div>
      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          placeholder="Misal: Buah matang merata, blok selatan…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
      <div style={{ gridColumn: '1 / -1' }}>
        <SubmitBtn label="Simpan Panenan" />
      </div>
    </FormGrid>
  )
}

function HarvestEditFields({ item }: { item: Harvest }) {
  const dateId = useId()
  const noteId = useId()

  return (
    <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <LabeledField htmlFor={dateId} label="Tanggal Panen">
        <input id={dateId} className={inputCls} type="date" name="harvestDate" defaultValue={toDateInputValue(item.harvestDate)} required />
      </LabeledField>
      <HarvestWeightField defaultValue={item.weightKg} />
      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField label="Ganti Foto" />
      </div>
      {item.photoPath && <RemovePhotoCheckbox />}
      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          defaultValue={item.note ?? ''}
          placeholder="Tambahkan catatan panen…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
    </>
  )
}

function HarvestTab({ kaplingId, items }: { kaplingId: string; items: Harvest[] }) {
  const [addOpen, setAddOpen] = useState(false)
  const [monthKey, setMonthKey] = useState('all')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'heaviest'>('newest')

  const searchId = useId()
  const monthId = useId()

  const monthOptions = extractMonthOptions(items, (h) => h.harvestDate)
  const filtered = filterActivityRecords(items, {
    monthKey,
    query,
    getDate: (h) => h.harvestDate,
    getSearchText: (h) => `${formatDate(h.harvestDate)} ${h.weightKg} kg ${h.note ?? ''}`,
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'heaviest') {
      if (b.weightKg !== a.weightKg) return b.weightKg - a.weightKg
    }
    return new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime()
  })

  const filteredKg = filtered.reduce((sum, h) => sum + h.weightKg, 0)
  const avgKg = filtered.length > 0 ? filteredKg / filtered.length : 0
  const topHarvest = filtered.reduce<Harvest | null>(
    (best, cur) => (!best || cur.weightKg > best.weightKg ? cur : best),
    null,
  )
  const maxFilteredKg = topHarvest?.weightKg ?? 0
  const hasFilter = monthKey !== 'all' || query.trim() !== '' || sortBy !== 'newest'

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <AddFormSection
        title="Tambah Panenan"
        subtitle="Catat hasil timbangan TBS terbaru"
        action={createHarvest}
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        {(defaultDate) => <HarvestCreateFields kaplingId={kaplingId} defaultDate={defaultDate} />}
      </AddFormSection>

      {items.length > 0 && (
        <>
          {/* Summary Strip */}
          <div className="panen-summary-strip" aria-label="Ringkasan statistik panen">
            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Panen
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#166534',
                  lineHeight: 1.2,
                }}
              >
                {formatKg(filteredKg)}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {filteredKg >= 1000 ? formatTonLabel(filteredKg) : `${filtered.length} kali panen`}
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Rata-rata / Panen
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1.2,
                }}
              >
                {filtered.length > 0 ? formatKg(avgKg) : '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {filtered.length > 0 ? `dari ${filtered.length} catatan` : 'belum ada data'}
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Panen Tertinggi
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#92400e',
                  lineHeight: 1.2,
                }}
              >
                {topHarvest ? formatKg(topHarvest.weightKg) : '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {topHarvest ? formatDate(topHarvest.harvestDate) : 'belum ada data'}
              </p>
            </div>
          </div>

          {/* Semantic Search & Sort Bar */}
          <search aria-label="Filter dan urutkan catatan panen">
            <div
              className="card"
              style={{
                padding: '12px 14px',
                display: 'grid',
                gap: 10,
                background: 'var(--color-surface)',
              }}
            >
              <div className="panen-toolbar-grid">
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <label
                    htmlFor={searchId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Cari catatan panen
                  </label>
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-muted-2)',
                      display: 'flex',
                      pointerEvents: 'none',
                    }}
                  >
                    <SearchIcon size={16} />
                  </span>
                  <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari catatan, tanggal, atau berat…"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="input-field"
                    style={{ paddingLeft: 36, paddingRight: query ? 36 : 12 }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label
                    htmlFor={monthId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Filter bulan panen
                  </label>
                  <select
                    id={monthId}
                    value={monthKey}
                    onChange={(e) => setMonthKey(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Semua Bulan</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="panen-sort-group" role="group" aria-label="Urutkan catatan panen">
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'newest'}
                    onClick={() => setSortBy('newest')}
                  >
                    Terbaru
                  </button>
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'heaviest'}
                    onClick={() => setSortBy('heaviest')}
                  >
                    Terberat
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  fontSize: '0.8125rem',
                  color: 'var(--color-muted)',
                }}
              >
                <span>
                  Menampilkan <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{filtered.length}</strong> dari{' '}
                  <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{items.length}</strong> catatan
                </span>

                {hasFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setMonthKey('all')
                      setQuery('')
                      setSortBy('newest')
                    }}
                    className="btn-secondary"
                    style={{ minBlockSize: 32, padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          </search>
        </>
      )}

      {items.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '32px 20px',
            display: 'grid',
            gap: 10,
            justifyItems: 'center',
            border: '1.5px dashed #cbe4d2',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#dcfce7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LeafIcon size={24} />
          </div>
          <div style={{ maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Belum ada catatan panen
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Catat hasil timbangan panen TBS pertama pada kapling ini untuk memantau total berat dan rata-rata hasil panen.
            </p>
          </div>
          {!addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="btn-primary"
              style={{ marginTop: 4 }}
            >
              <PlusIcon size={16} />
              <span>Catat Panen Pertama</span>
            </button>
          )}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyFilteredState onReset={() => { setMonthKey('all'); setQuery(''); setSortBy('newest') }} />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map((item) => {
            const isTop = topHarvest?.id === item.id && sorted.length > 1
            const weightPct = maxFilteredKg > 0 ? Math.max(4, (item.weightKg / maxFilteredKg) * 100) : 0

            return (
              <article key={item.id} className="panen-record-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: '#dcfce7',
                        border: '1px solid rgba(22, 163, 74, 0.2)',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <LeafIcon size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <strong
                          className="font-mono-num"
                          style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#166534', lineHeight: 1.2 }}
                        >
                          {formatKg(item.weightKg)}
                        </strong>
                        {item.weightKg >= 1000 && (
                          <span
                            className="font-mono-num"
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#166534',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              padding: '2px 7px',
                              borderRadius: 99,
                            }}
                          >
                            {formatTonLabel(item.weightKg)}
                          </span>
                        )}
                        {isTop && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#78350f',
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '2px 7px',
                              borderRadius: 99,
                            }}
                          >
                            Tertinggi
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 3,
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          fontWeight: 500,
                        }}
                      >
                        <CalendarIcon size={13} style={{ flexShrink: 0 }} />
                        <span>{formatDate(item.harvestDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {sorted.length > 1 && maxFilteredKg > 0 && (
                  <div className="progress-track" style={{ height: 4, marginTop: 11 }} aria-hidden="true">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${weightPct}%`,
                        background: isTop
                          ? 'linear-gradient(90deg, #15803d, #22c55e)'
                          : 'linear-gradient(90deg, #16a34a, #86efac)',
                      }}
                    />
                  </div>
                )}

                {item.note && (
                  <p
                    style={{
                      margin: '10px 0 0',
                      padding: '8px 11px',
                      borderRadius: 8,
                      background: 'var(--color-surface-2)',
                      borderLeft: '3px solid #86efac',
                      fontSize: '0.8125rem',
                      color: 'var(--color-ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.note}
                  </p>
                )}

                {item.photoPath && (
                  <div style={{ marginTop: 10 }}>
                    <PhotoLightboxButton
                      src={item.photoPath}
                      alt={`Foto Panen · ${formatDate(item.harvestDate)}`}
                      label="Lihat Foto Panen"
                      showThumbnail
                    />
                  </div>
                )}

                <ItemActions
                  deleteAction={deleteHarvest}
                  deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
                  confirmTitle="Hapus Data Panenan?"
                  confirmMessage={`Catatan panen ${formatKg(item.weightKg)} tanggal ${formatDate(item.harvestDate)} akan dihapus permanen.`}
                  renderEdit={(closeEdit) => (
                    <EditForm action={updateHarvest} onCancel={closeEdit} submitLabel="Simpan Panenan">
                      <HarvestEditFields item={item} />
                    </EditForm>
                  )}
                />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────── MAINTENANCE TAB ─────────────── */
const maintenanceTypeStyles: Record<string, { bg: string; border: string; color: string; accent: string }> = {
  SEMPROT: { bg: '#dcfce7', border: '#bbf7d0', color: '#166534', accent: '#16a34a' },
  BABAT: { bg: '#fef3c7', border: '#fde68a', color: '#78350f', accent: '#d97706' },
  PUPUK: { bg: '#e0f2fe', border: '#bae6fd', color: '#075985', accent: '#0284c7' },
}

const defaultMaintenanceStyle = { bg: '#f1f5f9', border: '#cbd5e1', color: '#334155', accent: '#475569' }

function mergeAddedOption(prev: DropdownItem[], next: DropdownItem): DropdownItem[] {
  return prev.some((o) => o.value === next.value) ? prev : [...prev, next]
}

function CurrencyInputField({
  name,
  label,
  defaultValue,
  required = false,
  min = 0,
  placeholder = '0',
  previewColor = '#075985',
  previewBg = '#e0f2fe',
}: {
  name: string
  label: string
  defaultValue?: number | null
  required?: boolean
  min?: number
  placeholder?: string
  previewColor?: string
  previewBg?: string
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const initialStr = defaultValue != null ? String(defaultValue) : ''
  const [valueStr, setValueStr] = useState(initialStr)

  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const handleReset = () => setValueStr(initialStr)
    form.addEventListener('reset', handleReset)
    return () => form.removeEventListener('reset', handleReset)
  }, [initialStr])

  const parsed = Number(valueStr)
  const showPreview = valueStr.trim() !== '' && Number.isFinite(parsed) && parsed > 0

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <label htmlFor={inputId} className="input-label">
          <span>
            {label}
            {!required && <span className="field-hint"> (Opsional)</span>}
          </span>
        </label>
        {showPreview && (
          <span
            className="font-mono-num"
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: previewColor,
              background: previewBg,
              padding: '2px 7px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
            }}
          >
            {formatCurrency(parsed)}
          </span>
        )}
      </div>
      <div className="input-prefix-wrap">
        <span className="input-prefix-badge" aria-hidden="true">
          Rp
        </span>
        <input
          ref={inputRef}
          id={inputId}
          className={inputCls}
          type="number"
          inputMode="numeric"
          enterKeyHint="next"
          step="1"
          min={min}
          name={name}
          defaultValue={defaultValue ?? ''}
          onChange={(e) => setValueStr(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      </div>
    </div>
  )
}

function MaintenanceCreateFields({
  kaplingId,
  defaultDate,
  options,
  onOptionAdded,
}: {
  kaplingId: string
  defaultDate: string
  options: DropdownItem[]
  onOptionAdded: (item: DropdownItem) => void
}) {
  const dateId = useId()
  const typeId = useId()
  const noteId = useId()

  return (
    <FormGrid>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <LabeledField htmlFor={dateId} label="Tanggal">
        <input id={dateId} className={inputCls} type="date" name="activityDate" defaultValue={defaultDate} required />
      </LabeledField>
      <LabeledField htmlFor={typeId} label="Jenis Perawatan">
        <CreatableSelect inputId={typeId} name="type" kaplingId={kaplingId} items={options} group="maintenanceType" onOptionAdded={onOptionAdded} />
      </LabeledField>
      <CurrencyInputField name="cost" label="Biaya" />
      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField />
      </div>
      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          placeholder="Misal: Blok timur, dosis 2 karung pupuk NPK…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
      <div style={{ gridColumn: '1 / -1' }}>
        <SubmitBtn label="Simpan Perawatan" />
      </div>
    </FormGrid>
  )
}

function MaintenanceEditFields({
  item,
  kaplingId,
  options,
  onOptionAdded,
}: {
  item: Maintenance
  kaplingId: string
  options: DropdownItem[]
  onOptionAdded: (item: DropdownItem) => void
}) {
  const dateId = useId()
  const typeId = useId()
  const noteId = useId()

  return (
    <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <LabeledField htmlFor={dateId} label="Tanggal">
        <input id={dateId} className={inputCls} type="date" name="activityDate" defaultValue={toDateInputValue(item.activityDate)} required />
      </LabeledField>
      <LabeledField htmlFor={typeId} label="Jenis Perawatan">
        <CreatableSelect
          inputId={typeId}
          name="type"
          kaplingId={kaplingId}
          items={options}
          group="maintenanceType"
          defaultValue={item.type}
          onOptionAdded={onOptionAdded}
        />
      </LabeledField>
      <CurrencyInputField name="cost" label="Biaya" defaultValue={item.cost} />
      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField label="Ganti Foto" />
      </div>
      {item.photoPath && <RemovePhotoCheckbox />}
      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          defaultValue={item.note ?? ''}
          placeholder="Tambahkan catatan perawatan…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
    </>
  )
}

function MaintenanceTab({
  kaplingId,
  items,
  typeOptions,
}: {
  kaplingId: string
  items: Maintenance[]
  typeOptions: DropdownItem[]
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addedOptions, setAddedOptions] = useState<DropdownItem[]>([])
  const [monthKey, setMonthKey] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'cost'>('newest')

  const searchId = useId()
  const monthId = useId()

  const options = mergeOptions(typeOptions, addedOptions)
  const handleAdded = (item: DropdownItem) => setAddedOptions((prev) => mergeAddedOption(prev, item))
  const typeLabel = Object.fromEntries(options.map((o) => [o.value, o.label]))

  const monthOptions = extractMonthOptions(items, (m) => m.activityDate)

  // Count occurrences per type across all items for quick filter chips
  const typeCounts = new Map<string, number>()
  for (const item of items) {
    typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1)
  }
  const availableTypes = [
    ...options
      .filter((o) => typeCounts.has(o.value))
      .map((o) => ({ value: o.value, label: o.label, count: typeCounts.get(o.value)! })),
    ...Array.from(typeCounts.entries())
      .filter(([value]) => !options.some((o) => o.value === value))
      .map(([value, count]) => ({ value, label: typeLabel[value] ?? value, count })),
  ]

  const baseFiltered = filterActivityRecords(items, {
    monthKey,
    query,
    getDate: (m) => m.activityDate,
    getSearchText: (m) => `${formatDate(m.activityDate)} ${typeLabel[m.type] ?? m.type} ${m.note ?? ''}`,
  })
  const filtered = typeFilter === 'all' ? baseFiltered : baseFiltered.filter((m) => m.type === typeFilter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'cost') {
      const ca = a.cost ?? -1
      const cb = b.cost ?? -1
      if (cb !== ca) return cb - ca
    }
    return new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
  })

  const filteredCost = filtered.reduce((sum, m) => sum + (m.cost ?? 0), 0)
  const costEntryCount = filtered.filter((m) => m.cost != null && m.cost > 0).length

  const filteredTypeCounts = new Map<string, number>()
  for (const m of filtered) {
    filteredTypeCounts.set(m.type, (filteredTypeCounts.get(m.type) ?? 0) + 1)
  }
  let topType: { label: string; count: number } | null = null
  for (const [val, cnt] of filteredTypeCounts.entries()) {
    if (!topType || cnt > topType.count) {
      topType = { label: typeLabel[val] ?? val, count: cnt }
    }
  }

  const hasFilter = monthKey !== 'all' || typeFilter !== 'all' || query.trim() !== '' || sortBy !== 'newest'
  const resetFilters = () => {
    setMonthKey('all')
    setTypeFilter('all')
    setQuery('')
    setSortBy('newest')
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <AddFormSection
        title="Tambah Perawatan"
        subtitle="Catat kegiatan semprot, babat, pemupukan, atau lainnya"
        action={createMaintenance}
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        {(defaultDate) => (
          <MaintenanceCreateFields kaplingId={kaplingId} defaultDate={defaultDate} options={options} onOptionAdded={handleAdded} />
        )}
      </AddFormSection>

      {items.length > 0 && (
        <>
          {/* Summary Strip */}
          <div className="panen-summary-strip" aria-label="Ringkasan statistik perawatan">
            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Biaya
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#075985',
                  lineHeight: 1.2,
                }}
              >
                {formatCurrency(filteredCost)}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {costEntryCount > 0 ? `${costEntryCount} kegiatan berbiaya` : 'belum ada biaya tercatat'}
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Kegiatan
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1.2,
                }}
              >
                {filtered.length} kali
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {filteredTypeCounts.size > 0 ? `${filteredTypeCounts.size} jenis perawatan` : 'belum ada data'}
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Paling Sering
              </p>
              <p
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#166534',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {topType ? topType.label : '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {topType ? `${topType.count} kali dilakukan` : 'belum ada data'}
              </p>
            </div>
          </div>

          {/* Semantic Search, Type Filter & Sort Bar */}
          <search aria-label="Filter dan urutkan catatan perawatan">
            <div
              className="card"
              style={{
                padding: '12px 14px',
                display: 'grid',
                gap: 10,
                background: 'var(--color-surface)',
              }}
            >
              <div className="panen-toolbar-grid">
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <label
                    htmlFor={searchId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Cari catatan perawatan
                  </label>
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-muted-2)',
                      display: 'flex',
                      pointerEvents: 'none',
                    }}
                  >
                    <SearchIcon size={16} />
                  </span>
                  <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari jenis atau catatan perawatan…"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="input-field"
                    style={{ paddingLeft: 36, paddingRight: query ? 36 : 12 }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label
                    htmlFor={monthId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Filter bulan perawatan
                  </label>
                  <select
                    id={monthId}
                    value={monthKey}
                    onChange={(e) => setMonthKey(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Semua Bulan</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="panen-sort-group" role="group" aria-label="Urutkan catatan perawatan">
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'newest'}
                    onClick={() => setSortBy('newest')}
                  >
                    Terbaru
                  </button>
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'cost'}
                    onClick={() => setSortBy('cost')}
                  >
                    Biaya Tertinggi
                  </button>
                </div>
              </div>

              {availableTypes.length > 1 && (
                <div className="filter-chip-row" role="group" aria-label="Filter jenis perawatan">
                  <button
                    type="button"
                    className="filter-chip"
                    aria-pressed={typeFilter === 'all'}
                    onClick={() => setTypeFilter('all')}
                  >
                    <span>Semua</span>
                    <span className="font-mono-num" style={{ opacity: 0.75 }}>{items.length}</span>
                  </button>
                  {availableTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className="filter-chip"
                      aria-pressed={typeFilter === t.value}
                      onClick={() => setTypeFilter((prev) => (prev === t.value ? 'all' : t.value))}
                    >
                      <span>{t.label}</span>
                      <span className="font-mono-num" style={{ opacity: 0.75 }}>{t.count}</span>
                    </button>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  fontSize: '0.8125rem',
                  color: 'var(--color-muted)',
                }}
              >
                <span>
                  Menampilkan <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{filtered.length}</strong> dari{' '}
                  <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{items.length}</strong> kegiatan
                </span>

                {hasFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="btn-secondary"
                    style={{ minBlockSize: 32, padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          </search>
        </>
      )}

      {items.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '32px 20px',
            display: 'grid',
            gap: 10,
            justifyItems: 'center',
            border: '1.5px dashed #bae6fd',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#e0f2fe',
              color: '#075985',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WrenchIcon size={24} />
          </div>
          <div style={{ maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Belum ada catatan perawatan
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Catat aktivitas semprot, babat, pemupukan, atau perawatan kebun lainnya untuk memantau jadwal dan biaya.
            </p>
          </div>
          {!addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="btn-primary"
              style={{ marginTop: 4 }}
            >
              <PlusIcon size={16} />
              <span>Catat Perawatan Pertama</span>
            </button>
          )}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyFilteredState onReset={resetFilters} />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map((item) => {
            const tc = maintenanceTypeStyles[item.type] ?? defaultMaintenanceStyle
            const labelText = typeLabel[item.type] ?? item.type

            return (
              <article key={item.id} className="panen-record-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: tc.bg,
                        border: `1px solid ${tc.border}`,
                        color: tc.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <WrenchIcon size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 99,
                            background: tc.bg,
                            border: `1px solid ${tc.border}`,
                            color: tc.color,
                          }}
                        >
                          {labelText}
                        </span>
                        {item.cost != null ? (
                          <strong
                            className="font-mono-num"
                            style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-ink)' }}
                          >
                            {formatCurrency(item.cost)}
                          </strong>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: 'var(--color-muted)',
                              background: 'var(--color-surface-2)',
                              border: '1px solid var(--color-border)',
                              padding: '2px 8px',
                              borderRadius: 99,
                            }}
                          >
                            Tanpa biaya
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 4,
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          fontWeight: 500,
                        }}
                      >
                        <CalendarIcon size={13} style={{ flexShrink: 0 }} />
                        <span>{formatDate(item.activityDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {item.note && (
                  <p
                    style={{
                      margin: '10px 0 0',
                      padding: '8px 11px',
                      borderRadius: 8,
                      background: 'var(--color-surface-2)',
                      borderLeft: `3px solid ${tc.accent}`,
                      fontSize: '0.8125rem',
                      color: 'var(--color-ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.note}
                  </p>
                )}

                {item.photoPath && (
                  <div style={{ marginTop: 10 }}>
                    <PhotoLightboxButton
                      src={item.photoPath}
                      alt={`Foto ${labelText} · ${formatDate(item.activityDate)}`}
                      label="Lihat Foto Perawatan"
                      showThumbnail
                    />
                  </div>
                )}

                <ItemActions
                  deleteAction={deleteMaintenance}
                  deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
                  confirmTitle="Hapus Data Perawatan?"
                  confirmMessage={`Catatan perawatan ${labelText} tanggal ${formatDate(item.activityDate)} akan dihapus permanen.`}
                  renderEdit={(closeEdit) => (
                    <EditForm action={updateMaintenance} onCancel={closeEdit} submitLabel="Simpan Perawatan">
                      <MaintenanceEditFields item={item} kaplingId={kaplingId} options={options} onOptionAdded={handleAdded} />
                    </EditForm>
                  )}
                />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────── EXPENSE TAB ─────────────── */
const expenseCategoryStyles: Record<string, { bg: string; border: string; color: string; accent: string }> = {
  GAJI_KARYAWAN: { bg: '#e0e7ff', border: '#c7d2fe', color: '#3730a3', accent: '#4f46e5' },
  LAIN_LAIN: { bg: '#f1f5f9', border: '#cbd5e1', color: '#334155', accent: '#475569' },
}

const customExpensePalette = [
  { bg: '#f3e8ff', border: '#e9d5ff', color: '#6b21a8', accent: '#7c3aed' },
  { bg: '#ccfbf1', border: '#99f6e4', color: '#115e59', accent: '#0d9488' },
  { bg: '#fef3c7', border: '#fde68a', color: '#78350f', accent: '#d97706' },
  { bg: '#fce7f3', border: '#fbcfe8', color: '#9d174d', accent: '#db2777' },
]

function getExpenseCategoryStyle(category: string, index: number) {
  return expenseCategoryStyles[category] ?? customExpensePalette[Math.max(0, index) % customExpensePalette.length]
}

function ExpenseCreateFields({
  kaplingId,
  defaultDate,
  options,
  onOptionAdded,
}: {
  kaplingId: string
  defaultDate: string
  options: DropdownItem[]
  onOptionAdded: (item: DropdownItem) => void
}) {
  const dateId = useId()
  const catId = useId()
  const noteId = useId()

  return (
    <FormGrid>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <LabeledField htmlFor={dateId} label="Tanggal">
        <input id={dateId} className={inputCls} type="date" name="expenseDate" defaultValue={defaultDate} required />
      </LabeledField>
      <LabeledField htmlFor={catId} label="Kategori">
        <CreatableSelect inputId={catId} name="category" kaplingId={kaplingId} items={options} group="expenseCategory" onOptionAdded={onOptionAdded} />
      </LabeledField>
      <CurrencyInputField
        name="amount"
        label="Nominal"
        required
        min={1}
        placeholder="Contoh: 250000"
        previewColor="#b91c1c"
        previewBg="#fee2e2"
      />
      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField />
      </div>
      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          placeholder="Misal: Upah borongan panen atau biaya angkut…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
      <div style={{ gridColumn: '1 / -1' }}>
        <SubmitBtn label="Simpan Pengeluaran" />
      </div>
    </FormGrid>
  )
}

function ExpenseEditFields({
  item,
  kaplingId,
  options,
  onOptionAdded,
}: {
  item: Expense
  kaplingId: string
  options: DropdownItem[]
  onOptionAdded: (item: DropdownItem) => void
}) {
  const dateId = useId()
  const catId = useId()
  const noteId = useId()

  return (
    <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <LabeledField htmlFor={dateId} label="Tanggal">
        <input id={dateId} className={inputCls} type="date" name="expenseDate" defaultValue={toDateInputValue(item.expenseDate)} required />
      </LabeledField>
      <LabeledField htmlFor={catId} label="Kategori">
        <CreatableSelect
          inputId={catId}
          name="category"
          kaplingId={kaplingId}
          items={options}
          group="expenseCategory"
          defaultValue={item.category}
          onOptionAdded={onOptionAdded}
        />
      </LabeledField>
      <CurrencyInputField
        name="amount"
        label="Nominal"
        defaultValue={item.amount}
        required
        min={1}
        placeholder="Contoh: 250000"
        previewColor="#b91c1c"
        previewBg="#fee2e2"
      />
      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField label="Ganti Foto" />
      </div>
      {item.photoPath && <RemovePhotoCheckbox />}
      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          defaultValue={item.note ?? ''}
          placeholder="Tambahkan catatan pengeluaran…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
    </>
  )
}

function ExpenseTab({
  kaplingId,
  items,
  categoryOptions,
}: {
  kaplingId: string
  items: Expense[]
  categoryOptions: DropdownItem[]
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addedOptions, setAddedOptions] = useState<DropdownItem[]>([])
  const [monthKey, setMonthKey] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'amount'>('newest')

  const searchId = useId()
  const monthId = useId()

  const options = mergeOptions(categoryOptions, addedOptions)
  const handleAdded = (item: DropdownItem) => setAddedOptions((prev) => mergeAddedOption(prev, item))
  const categoryLabel = Object.fromEntries(options.map((o) => [o.value, o.label]))
  const categoryIndexMap = new Map(options.map((o, idx) => [o.value, idx]))

  const monthOptions = extractMonthOptions(items, (e) => e.expenseDate)

  const categoryCounts = new Map<string, number>()
  for (const item of items) {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1)
  }
  const availableCategories = [
    ...options
      .filter((o) => categoryCounts.has(o.value))
      .map((o) => ({ value: o.value, label: o.label, count: categoryCounts.get(o.value)! })),
    ...Array.from(categoryCounts.entries())
      .filter(([value]) => !options.some((o) => o.value === value))
      .map(([value, count]) => ({ value, label: categoryLabel[value] ?? value, count })),
  ]

  const baseFiltered = filterActivityRecords(items, {
    monthKey,
    query,
    getDate: (e) => e.expenseDate,
    getSearchText: (e) => `${formatDate(e.expenseDate)} ${categoryLabel[e.category] ?? e.category} ${e.note ?? ''}`,
  })
  const filtered = categoryFilter === 'all' ? baseFiltered : baseFiltered.filter((e) => e.category === categoryFilter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'amount' && b.amount !== a.amount) {
      return b.amount - a.amount
    }
    return new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  })

  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0)
  const avgExpense = filtered.length > 0 ? filteredTotal / filtered.length : 0

  const topExpense = filtered.reduce<Expense | null>(
    (best, cur) => (!best || cur.amount > best.amount ? cur : best),
    null,
  )
  const maxFilteredAmount = topExpense?.amount ?? 0

  const filteredCategoryTotals = new Map<string, number>()
  for (const e of filtered) {
    filteredCategoryTotals.set(e.category, (filteredCategoryTotals.get(e.category) ?? 0) + e.amount)
  }
  let topCategory: { label: string; amount: number } | null = null
  for (const [val, total] of filteredCategoryTotals.entries()) {
    if (!topCategory || total > topCategory.amount) {
      topCategory = { label: categoryLabel[val] ?? val, amount: total }
    }
  }
  const topCategoryPct = topCategory && filteredTotal > 0 ? Math.round((topCategory.amount / filteredTotal) * 100) : 0

  const hasFilter = monthKey !== 'all' || categoryFilter !== 'all' || query.trim() !== '' || sortBy !== 'newest'
  const resetFilters = () => {
    setMonthKey('all')
    setCategoryFilter('all')
    setQuery('')
    setSortBy('newest')
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <AddFormSection
        title="Tambah Pengeluaran"
        subtitle="Catat gaji karyawan, upah borongan, atau biaya operasional lainnya"
        action={createExpense}
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        {(defaultDate) => (
          <ExpenseCreateFields kaplingId={kaplingId} defaultDate={defaultDate} options={options} onOptionAdded={handleAdded} />
        )}
      </AddFormSection>

      {items.length > 0 && (
        <>
          {/* Summary Strip */}
          <div className="panen-summary-strip" aria-label="Ringkasan statistik pengeluaran">
            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Pengeluaran
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#b91c1c',
                  lineHeight: 1.2,
                }}
              >
                {formatCurrency(filteredTotal)}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                dari {filtered.length} transaksi
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Rata-rata / Transaksi
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1.2,
                }}
              >
                {filtered.length > 0 ? formatCurrency(avgExpense) : '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {filteredCategoryTotals.size > 0 ? `${filteredCategoryTotals.size} kategori tercatat` : 'belum ada data'}
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Pos Terbesar
              </p>
              <p
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  color: '#3730a3',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {topCategory ? topCategory.label : '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {topCategory ? `${topCategoryPct}% (${formatCurrency(topCategory.amount)})` : 'belum ada data'}
              </p>
            </div>
          </div>

          {/* Semantic Search, Category Filter & Sort Bar */}
          <search aria-label="Filter dan urutkan catatan pengeluaran">
            <div
              className="card"
              style={{
                padding: '12px 14px',
                display: 'grid',
                gap: 10,
                background: 'var(--color-surface)',
              }}
            >
              <div className="panen-toolbar-grid">
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <label
                    htmlFor={searchId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Cari catatan pengeluaran
                  </label>
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-muted-2)',
                      display: 'flex',
                      pointerEvents: 'none',
                    }}
                  >
                    <SearchIcon size={16} />
                  </span>
                  <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari kategori atau catatan pengeluaran…"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="input-field"
                    style={{ paddingLeft: 36, paddingRight: query ? 36 : 12 }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label
                    htmlFor={monthId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Filter bulan pengeluaran
                  </label>
                  <select
                    id={monthId}
                    value={monthKey}
                    onChange={(e) => setMonthKey(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Semua Bulan</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="panen-sort-group" role="group" aria-label="Urutkan catatan pengeluaran">
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'newest'}
                    onClick={() => setSortBy('newest')}
                  >
                    Terbaru
                  </button>
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'amount'}
                    onClick={() => setSortBy('amount')}
                  >
                    Nominal Tertinggi
                  </button>
                </div>
              </div>

              {availableCategories.length > 1 && (
                <div className="filter-chip-row" role="group" aria-label="Filter kategori pengeluaran">
                  <button
                    type="button"
                    className="filter-chip"
                    aria-pressed={categoryFilter === 'all'}
                    onClick={() => setCategoryFilter('all')}
                  >
                    <span>Semua</span>
                    <span className="font-mono-num" style={{ opacity: 0.75 }}>{items.length}</span>
                  </button>
                  {availableCategories.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className="filter-chip"
                      aria-pressed={categoryFilter === c.value}
                      onClick={() => setCategoryFilter((prev) => (prev === c.value ? 'all' : c.value))}
                    >
                      <span>{c.label}</span>
                      <span className="font-mono-num" style={{ opacity: 0.75 }}>{c.count}</span>
                    </button>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  fontSize: '0.8125rem',
                  color: 'var(--color-muted)',
                }}
              >
                <span>
                  Menampilkan <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{filtered.length}</strong> dari{' '}
                  <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{items.length}</strong> transaksi
                </span>

                {hasFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="btn-secondary"
                    style={{ minBlockSize: 32, padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          </search>
        </>
      )}

      {items.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '32px 20px',
            display: 'grid',
            gap: 10,
            justifyItems: 'center',
            border: '1.5px dashed #fecaca',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#fee2e2',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ReceiptIcon size={24} />
          </div>
          <div style={{ maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Belum ada catatan pengeluaran
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Catat pengeluaran seperti gaji karyawan, ongkos angkut, atau biaya operasional kebun lainnya agar perhitungan laba bersih akurat.
            </p>
          </div>
          {!addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="btn-primary"
              style={{ marginTop: 4 }}
            >
              <PlusIcon size={16} />
              <span>Catat Pengeluaran Pertama</span>
            </button>
          )}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyFilteredState onReset={resetFilters} />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map((item) => {
            const catText = categoryLabel[item.category] ?? item.category
            const cs = getExpenseCategoryStyle(item.category, categoryIndexMap.get(item.category) ?? 0)
            const isTop = topExpense?.id === item.id && sorted.length > 1
            const amountPct = maxFilteredAmount > 0 ? Math.max(4, (item.amount / maxFilteredAmount) * 100) : 0

            return (
              <article key={item.id} className="panen-record-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ReceiptIcon size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <strong
                          className="font-mono-num"
                          style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1.2 }}
                        >
                          {formatCurrency(item.amount)}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 9px',
                            borderRadius: 99,
                            background: cs.bg,
                            border: `1px solid ${cs.border}`,
                            color: cs.color,
                          }}
                        >
                          {catText}
                        </span>
                        {isTop && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#991b1b',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              padding: '2px 7px',
                              borderRadius: 99,
                            }}
                          >
                            Terbesar
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 4,
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          fontWeight: 500,
                        }}
                      >
                        <CalendarIcon size={13} style={{ flexShrink: 0 }} />
                        <span>{formatDate(item.expenseDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {sorted.length > 1 && maxFilteredAmount > 0 && (
                  <div className="progress-track" style={{ height: 4, marginTop: 11 }} aria-hidden="true">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${amountPct}%`,
                        background: isTop
                          ? 'linear-gradient(90deg, #b91c1c, #ef4444)'
                          : 'linear-gradient(90deg, #dc2626, #fca5a5)',
                      }}
                    />
                  </div>
                )}

                {item.note && (
                  <p
                    style={{
                      margin: '10px 0 0',
                      padding: '8px 11px',
                      borderRadius: 8,
                      background: 'var(--color-surface-2)',
                      borderLeft: `3px solid ${cs.accent}`,
                      fontSize: '0.8125rem',
                      color: 'var(--color-ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.note}
                  </p>
                )}

                {item.photoPath && (
                  <div style={{ marginTop: 10 }}>
                    <PhotoLightboxButton
                      src={item.photoPath}
                      alt={`Foto ${catText} · ${formatDate(item.expenseDate)}`}
                      label="Lihat Bukti Pengeluaran"
                      showThumbnail
                    />
                  </div>
                )}

                <ItemActions
                  deleteAction={deleteExpense}
                  deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
                  confirmTitle="Hapus Data Pengeluaran?"
                  confirmMessage={`Pengeluaran ${catText} sebesar ${formatCurrency(item.amount)} akan dihapus permanen.`}
                  renderEdit={(closeEdit) => (
                    <EditForm action={updateExpense} onCancel={closeEdit} submitLabel="Simpan Pengeluaran">
                      <ExpenseEditFields item={item} kaplingId={kaplingId} options={options} onOptionAdded={handleAdded} />
                    </EditForm>
                  )}
                />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────── SALE TAB (with Live Calculator) ─────────────── */
function SalePriceCalculatorFields({
  defaultDate,
  defaultWeight = '',
  defaultPrice = '',
  defaultNote = '',
  photoLabel = 'Foto',
  hasExistingPhoto = false,
}: {
  defaultDate: string
  defaultWeight?: string
  defaultPrice?: string
  defaultNote?: string
  photoLabel?: string
  hasExistingPhoto?: boolean
}) {
  const dateId = useId()
  const weightId = useId()
  const priceId = useId()
  const noteId = useId()

  const anchorRef = useRef<HTMLInputElement>(null)
  const [weight, setWeight] = useState(defaultWeight)
  const [price, setPrice] = useState(defaultPrice)

  useEffect(() => {
    const form = anchorRef.current?.form
    if (!form) return
    const handleReset = () => {
      setWeight(defaultWeight)
      setPrice(defaultPrice)
    }
    form.addEventListener('reset', handleReset)
    return () => form.removeEventListener('reset', handleReset)
  }, [defaultWeight, defaultPrice])

  const parsedWeight = Number(weight)
  const parsedPrice = Number(price)
  const showTonHint = Number.isFinite(parsedWeight) && parsedWeight >= 100
  const showPriceHint = price.trim() !== '' && Number.isFinite(parsedPrice) && parsedPrice > 0
  const totalPreview = computeSaleTotalPreview(weight, price)

  return (
    <>
      <LabeledField htmlFor={dateId} label="Tanggal Jual">
        <input ref={anchorRef} id={dateId} className={inputCls} type="date" name="saleDate" defaultValue={defaultDate} required />
      </LabeledField>

      <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label htmlFor={weightId} className="input-label">
            <span>Berat (kg)</span>
          </label>
          {showTonHint && (
            <span
              className="font-mono-num"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#166534',
                background: '#dcfce7',
                padding: '2px 7px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              {formatTonLabel(parsedWeight)}
            </span>
          )}
        </div>
        <div className="input-unit-wrap">
          <input
            id={weightId}
            className={inputCls}
            type="number"
            inputMode="decimal"
            enterKeyHint="next"
            step="0.01"
            min="0.01"
            name="weightKg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Contoh: 1200"
            required
          />
          <span className="input-unit-badge" aria-hidden="true">
            kg
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label htmlFor={priceId} className="input-label">
            <span>Harga / kg</span>
          </label>
          {showPriceHint && (
            <span
              className="font-mono-num"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#78350f',
                background: '#fef3c7',
                padding: '2px 7px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(parsedPrice)}
            </span>
          )}
        </div>
        <div className="input-prefix-wrap">
          <span className="input-prefix-badge" aria-hidden="true">
            Rp
          </span>
          <input
            id={priceId}
            className={inputCls}
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            step="1"
            min="1"
            name="pricePerKg"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Contoh: 2650"
            required
          />
        </div>
      </div>

      {/* Live Subtotal Estimate */}
      <div
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${totalPreview !== null ? '#fcd34d' : 'var(--color-border)'}`,
          background: totalPreview !== null ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)' : 'var(--color-surface)',
        }}
      >
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: totalPreview !== null ? '#78350f' : 'var(--color-muted)',
          }}
        >
          Estimasi Total Omset
        </span>
        <span
          className="font-mono-num"
          style={{
            marginTop: 2,
            fontSize: totalPreview !== null ? '1.1rem' : '0.8125rem',
            fontWeight: 800,
            color: totalPreview !== null ? '#78350f' : 'var(--color-muted-2)',
            lineHeight: 1.2,
          }}
        >
          {totalPreview !== null ? formatCurrency(totalPreview) : 'Isi berat & harga/kg'}
        </span>
        {totalPreview !== null && (
          <span className="font-mono-num" style={{ marginTop: 2, fontSize: '0.6875rem', fontWeight: 600, color: '#92400e' }}>
            {formatKg(parsedWeight)} × {formatCurrency(parsedPrice)}/kg
          </span>
        )}
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <PhotoUploadField label={photoLabel} />
      </div>
      {hasExistingPhoto && <RemovePhotoCheckbox />}

      <LabeledField htmlFor={noteId} label="Catatan" hint="Opsional" fullWidth>
        <textarea
          id={noteId}
          className={inputCls}
          name="note"
          rows={2}
          maxLength={1000}
          defaultValue={defaultNote}
          placeholder="Misal: Jual ke RAM Pak Budi, potongan timbangan 2%…"
          style={{ resize: 'vertical', paddingTop: 10 }}
        />
      </LabeledField>
    </>
  )
}

function SaleTab({ kaplingId, items }: { kaplingId: string; items: Sale[] }) {
  const [addOpen, setAddOpen] = useState(false)
  const [monthKey, setMonthKey] = useState('all')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'revenue' | 'price'>('newest')

  const searchId = useId()
  const monthId = useId()

  const monthOptions = extractMonthOptions(items, (s) => s.saleDate)
  const filtered = filterActivityRecords(items, {
    monthKey,
    query,
    getDate: (s) => s.saleDate,
    getSearchText: (s) => `${formatDate(s.saleDate)} ${s.weightKg} ${s.pricePerKg} ${s.note ?? ''}`,
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'revenue') {
      const ra = a.weightKg * a.pricePerKg
      const rb = b.weightKg * b.pricePerKg
      if (rb !== ra) return rb - ra
    } else if (sortBy === 'price') {
      if (b.pricePerKg !== a.pricePerKg) return b.pricePerKg - a.pricePerKg
    }
    return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
  })

  const filteredKg = filtered.reduce((sum, s) => sum + s.weightKg, 0)
  const filteredRevenue = filtered.reduce((sum, s) => sum + s.weightKg * s.pricePerKg, 0)
  const avgPricePerKg = filteredKg > 0 ? filteredRevenue / filteredKg : 0

  const topRevenueSale = filtered.reduce<Sale | null>(
    (best, cur) => (!best || cur.weightKg * cur.pricePerKg > best.weightKg * best.pricePerKg ? cur : best),
    null,
  )
  const maxFilteredRevenue = topRevenueSale ? topRevenueSale.weightKg * topRevenueSale.pricePerKg : 0
  const hasFilter = monthKey !== 'all' || query.trim() !== '' || sortBy !== 'newest'
  const resetFilters = () => {
    setMonthKey('all')
    setQuery('')
    setSortBy('newest')
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <AddFormSection
        title="Tambah Penjualan"
        subtitle="Catat berat timbangan, harga TBS per kg, dan bukti penjualan"
        action={createSale}
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        {(defaultDate) => (
          <FormGrid>
            <input type="hidden" name="kaplingId" value={kaplingId} />
            <SalePriceCalculatorFields defaultDate={defaultDate} />
            <div style={{ gridColumn: '1 / -1' }}>
              <SubmitBtn label="Simpan Penjualan" />
            </div>
          </FormGrid>
        )}
      </AddFormSection>

      {items.length > 0 && (
        <>
          {/* Summary Strip */}
          <div className="panen-summary-strip" aria-label="Ringkasan statistik penjualan">
            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Omset
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#78350f',
                  lineHeight: 1.2,
                }}
              >
                {formatCurrency(filteredRevenue)}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                dari {filtered.length} penjualan
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Volume Terjual
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#166534',
                  lineHeight: 1.2,
                }}
              >
                {formatKg(filteredKg)}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {filteredKg >= 1000 ? formatTonLabel(filteredKg) : 'total berat TBS'}
              </p>
            </div>

            <div className="panen-summary-cell">
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Rata-rata Harga
              </p>
              <p
                className="font-mono-num"
                style={{
                  margin: '4px 0 2px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1.2,
                }}
              >
                {filteredKg > 0 ? `${formatCurrency(Math.round(avgPricePerKg))}/kg` : '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {filteredKg > 0 ? 'rata-rata tertimbang' : 'belum ada data'}
              </p>
            </div>
          </div>

          {/* Semantic Search & Sort Bar */}
          <search aria-label="Filter dan urutkan catatan penjualan">
            <div
              className="card"
              style={{
                padding: '12px 14px',
                display: 'grid',
                gap: 10,
                background: 'var(--color-surface)',
              }}
            >
              <div className="panen-toolbar-grid">
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <label
                    htmlFor={searchId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Cari catatan penjualan
                  </label>
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-muted-2)',
                      display: 'flex',
                      pointerEvents: 'none',
                    }}
                  >
                    <SearchIcon size={16} />
                  </span>
                  <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari berat, harga/kg, atau catatan…"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="input-field"
                    style={{ paddingLeft: 36, paddingRight: query ? 36 : 12 }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label
                    htmlFor={monthId}
                    className="input-label"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Filter bulan penjualan
                  </label>
                  <select
                    id={monthId}
                    value={monthKey}
                    onChange={(e) => setMonthKey(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Semua Bulan</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="panen-sort-group" role="group" aria-label="Urutkan catatan penjualan">
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'newest'}
                    onClick={() => setSortBy('newest')}
                  >
                    Terbaru
                  </button>
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'revenue'}
                    onClick={() => setSortBy('revenue')}
                  >
                    Omset
                  </button>
                  <button
                    type="button"
                    className="panen-sort-btn"
                    aria-pressed={sortBy === 'price'}
                    onClick={() => setSortBy('price')}
                  >
                    Harga/kg
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  fontSize: '0.8125rem',
                  color: 'var(--color-muted)',
                }}
              >
                <span>
                  Menampilkan <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{filtered.length}</strong> dari{' '}
                  <strong className="font-mono-num" style={{ color: 'var(--color-ink)' }}>{items.length}</strong> penjualan
                </span>

                {hasFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="btn-secondary"
                    style={{ minBlockSize: 32, padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          </search>
        </>
      )}

      {items.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '32px 20px',
            display: 'grid',
            gap: 10,
            justifyItems: 'center',
            border: '1.5px dashed #fde68a',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#fef3c7',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CoinsIcon size={24} />
          </div>
          <div style={{ maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Belum ada catatan penjualan
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Catat penjualan TBS lengkap dengan berat dan harga per kg untuk menghitung total omset dan rata-rata harga jual.
            </p>
          </div>
          {!addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="btn-primary"
              style={{ marginTop: 4 }}
            >
              <PlusIcon size={16} />
              <span>Catat Penjualan Pertama</span>
            </button>
          )}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyFilteredState onReset={resetFilters} />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map((item) => {
            const totalRevenue = item.weightKg * item.pricePerKg
            const isTop = topRevenueSale?.id === item.id && sorted.length > 1
            const revPct = maxFilteredRevenue > 0 ? Math.max(4, (totalRevenue / maxFilteredRevenue) * 100) : 0

            return (
              <article key={item.id} className="panen-record-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CoinsIcon size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <strong
                          className="font-mono-num"
                          style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#78350f', lineHeight: 1.2 }}
                        >
                          {formatCurrency(totalRevenue)}
                        </strong>
                        <span
                          className="font-mono-num"
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: '#166534',
                            background: '#dcfce7',
                            border: '1px solid #bbf7d0',
                            padding: '2px 8px',
                            borderRadius: 99,
                          }}
                        >
                          {formatCurrency(item.pricePerKg)}/kg
                        </span>
                        {isTop && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#78350f',
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '2px 7px',
                              borderRadius: 99,
                            }}
                          >
                            Omset Tertinggi
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          marginTop: 4,
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CalendarIcon size={13} style={{ flexShrink: 0 }} />
                          <span>{formatDate(item.saleDate)}</span>
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="font-mono-num" style={{ fontWeight: 600, color: 'var(--color-ink-2)' }}>
                          {formatKg(item.weightKg)}
                        </span>
                        {item.weightKg >= 1000 && (
                          <span className="font-mono-num" style={{ color: 'var(--color-muted)' }}>
                            ({formatTonLabel(item.weightKg)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {sorted.length > 1 && maxFilteredRevenue > 0 && (
                  <div className="progress-track" style={{ height: 4, marginTop: 11 }} aria-hidden="true">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${revPct}%`,
                        background: isTop
                          ? 'linear-gradient(90deg, #b45309, #f59e0b)'
                          : 'linear-gradient(90deg, #d97706, #fcd34d)',
                      }}
                    />
                  </div>
                )}

                {item.note && (
                  <p
                    style={{
                      margin: '10px 0 0',
                      padding: '8px 11px',
                      borderRadius: 8,
                      background: 'var(--color-surface-2)',
                      borderLeft: '3px solid #fbbf24',
                      fontSize: '0.8125rem',
                      color: 'var(--color-ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.note}
                  </p>
                )}

                {item.photoPath && (
                  <div style={{ marginTop: 10 }}>
                    <PhotoLightboxButton
                      src={item.photoPath}
                      alt={`Foto Penjualan · ${formatDate(item.saleDate)}`}
                      label="Lihat Slip Penjualan"
                      showThumbnail
                    />
                  </div>
                )}

                <ItemActions
                  deleteAction={deleteSale}
                  deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
                  confirmTitle="Hapus Data Penjualan?"
                  confirmMessage={`Penjualan ${formatCurrency(totalRevenue)} tanggal ${formatDate(item.saleDate)} akan dihapus permanen.`}
                  renderEdit={(closeEdit) => (
                    <EditForm action={updateSale} onCancel={closeEdit} submitLabel="Simpan Penjualan">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="kaplingId" value={item.kaplingId} />
                      <SalePriceCalculatorFields
                        defaultDate={toDateInputValue(item.saleDate)}
                        defaultWeight={String(item.weightKg)}
                        defaultPrice={String(item.pricePerKg)}
                        defaultNote={item.note ?? ''}
                        photoLabel="Ganti Foto"
                        hasExistingPhoto={Boolean(item.photoPath)}
                      />
                    </EditForm>
                  )}
                />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────── SETTINGS TAB ─────────────── */
function SettingsTab({
  kaplingId,
  kaplingName,
  isActive,
  counts,
}: {
  kaplingId: string
  kaplingName: string
  isActive: boolean
  counts: {
    harvests: number
    maintenance: number
    expenses: number
    sales: number
  }
}) {
  const [renameState, renameAction] = useActionState(updateKapling, null)
  const [deactivateState, deactivateAction] = useActionState(deactivateKapling, null)
  const [nameDraft, setNameDraft] = useState(kaplingName)

  useEffect(() => {
    setNameDraft(kaplingName)
  }, [kaplingName])

  const nameInputId = useId()
  const renameHeadingId = useId()
  const deactivateHeadingId = useId()

  const totalRecords = counts.harvests + counts.maintenance + counts.expenses + counts.sales
  const isUnchanged = nameDraft.trim() === kaplingName

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Kapling Profile Summary Card */}
      <div
        className="card"
        style={{
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PalmIcon size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 800,
                  color: 'var(--color-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {kaplingName}
              </span>
              <span className="badge badge-active">
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }}
                />
                {isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              <span className="font-mono-num" style={{ fontWeight: 700, color: 'var(--color-ink-2)' }}>
                {totalRecords}
              </span>{' '}
              catatan tersimpan ({counts.harvests} panen &middot; {counts.maintenance} perawatan &middot;{' '}
              {counts.expenses} pengeluaran &middot; {counts.sales} penjualan)
            </p>
          </div>
        </div>
      </div>

      {/* Rename Section */}
      <section className="card" style={{ padding: 18 }} aria-labelledby={renameHeadingId}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'var(--color-surface-tint)',
              border: '1px solid #d5eadb',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <EditIcon size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 id={renameHeadingId} style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              Ubah Nama Kapling
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Perbarui nama kapling yang tampil di dashboard, sidebar, dan laporan PDF.
            </p>
          </div>
        </div>

        <form action={renameAction} aria-labelledby={renameHeadingId} style={{ display: 'grid', gap: 12 }}>
          <input type="hidden" name="id" value={kaplingId} />
          <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <label htmlFor={nameInputId} className="input-label">
                <span>Nama Kapling</span>
              </label>
              <span
                className="font-mono-num"
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--color-muted)',
                }}
              >
                {nameDraft.trim().length}/100
              </span>
            </div>
            <input
              id={nameInputId}
              className={inputCls}
              name="name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={100}
              enterKeyHint="done"
              placeholder="Contoh: Blok A1 Utara"
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {isUnchanged ? 'Belum ada perubahan nama.' : 'Nama baru siap disimpan.'}
            </span>
            <div style={{ flex: '1 1 200px', maxWidth: 260, marginLeft: 'auto' }}>
              <SubmitBtn label="Simpan Perubahan" pendingLabel="Menyimpan…" />
            </div>
          </div>

          <ActionMsg state={renameState} />
        </form>
      </section>

      {/* Deactivate Section */}
      {isActive && (
        <section
          aria-labelledby={deactivateHeadingId}
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangleIcon size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 id={deactivateHeadingId} style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#b91c1c' }}>
                  Nonaktifkan Kapling
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                  Hentikan sementara pencatatan aktivitas baru pada kapling ini.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Status Kapling
            </span>
          </div>

          <ul
            style={{
              margin: '0 0 14px',
              padding: '10px 12px',
              listStyle: 'none',
              display: 'grid',
              gap: 6,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.72)',
              border: '1px solid #fecaca',
              fontSize: '0.8125rem',
              color: 'var(--color-ink-2)',
              lineHeight: 1.45,
            }}
          >
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <CheckCircleIcon size={14} style={{ color: '#166534', flexShrink: 0, marginTop: 3 }} />
              <span>
                Seluruh <strong className="font-mono-num">{totalRecords}</strong> catatan historis tetap aman tersimpan dan tetap dihitung di ringkasan keuangan.
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <BanIcon size={14} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 3 }} />
              <span>
                Kapling dipindahkan ke grup <strong>Nonaktif</strong> di menu samping dan dapat diaktifkan kembali kapan saja.
              </span>
            </li>
          </ul>

          <form action={deactivateAction} aria-labelledby={deactivateHeadingId} style={{ display: 'grid', gap: 10 }}>
            <input type="hidden" name="id" value={kaplingId} />
            <ConfirmSubmitButton
              confirmTitle="Nonaktifkan Kapling?"
              confirmMessage={`Kapling "${kaplingName}" akan dipindahkan ke daftar nonaktif. Semua catatan historis tetap tersimpan dan kapling bisa diaktifkan kembali kapan saja.`}
              confirmLabel="Ya, Nonaktifkan"
              tone="warning"
              label="Nonaktifkan Kapling"
              pendingLabel="Menonaktifkan…"
              icon={<BanIcon size={16} />}
              className="btn-danger-outline"
              style={{ width: '100%', minBlockSize: 44, background: 'var(--color-surface)' }}
            />
            <ActionMsg state={deactivateState} />
          </form>
        </section>
      )}
    </div>
  )
}

/* ─────────────── MAIN ACTIVITY TABS ─────────────── */
interface ActivityTabsProps {
  kaplingId: string
  kaplingName: string
  isActive: boolean
  initialTab?: KaplingTabId
  harvests: Harvest[]
  maintenance: Maintenance[]
  expenses: Expense[]
  sales: Sale[]
  maintenanceTypeOptions: DropdownItem[]
  expenseCategoryOptions: DropdownItem[]
}

const TABS: ReadonlyArray<{ id: KaplingTabId; label: string; renderIcon: () => React.ReactNode }> = [
  { id: 'panen', label: 'Panen', renderIcon: () => <LeafIcon size={15} /> },
  { id: 'perawatan', label: 'Perawatan', renderIcon: () => <WrenchIcon size={15} /> },
  { id: 'pengeluaran', label: 'Pengeluaran', renderIcon: () => <ReceiptIcon size={15} /> },
  { id: 'penjualan', label: 'Penjualan', renderIcon: () => <CoinsIcon size={15} /> },
  { id: 'laporan', label: 'Laporan', renderIcon: () => <BarChartIcon size={15} /> },
  { id: 'pengaturan', label: 'Pengaturan', renderIcon: () => <SettingsIcon size={15} /> },
]

export function ActivityTabs({
  kaplingId,
  kaplingName,
  isActive,
  initialTab = 'panen',
  harvests,
  maintenance,
  expenses,
  sales,
  maintenanceTypeOptions,
  expenseCategoryOptions,
}: ActivityTabsProps) {
  const [activeTab, setActiveTab] = useState<KaplingTabId>(initialTab)
  const tabRefs = useRef<Partial<Record<KaplingTabId, HTMLButtonElement | null>>>({})

  const selectTab = (nextId: KaplingTabId, options?: { focus?: boolean }) => {
    setActiveTab(nextId)

    const targetBtn = tabRefs.current[nextId]
    if (targetBtn) {
      if (options?.focus) targetBtn.focus()
      targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (nextId === 'panen') {
        url.searchParams.delete('tab')
      } else {
        url.searchParams.set('tab', nextId)
      }
      window.history.replaceState(null, '', url.toString())
    }
  }

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab)
    if (currentIndex === -1) return

    let nextIndex = -1
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TABS.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = TABS.length - 1
    }

    if (nextIndex !== -1) {
      e.preventDefault()
      selectTab(TABS[nextIndex].id, { focus: true })
    }
  }

  const tabCounts: Partial<Record<KaplingTabId, number>> = {
    panen: harvests.length,
    perawatan: maintenance.length,
    pengeluaran: expenses.length,
    penjualan: sales.length,
  }

  return (
    <div>
      {/* Accessible Horizontal Tab Bar */}
      <div className="tablist-scroller">
        <div
          role="tablist"
          aria-label="Aktivitas kapling"
          className="tablist-bar"
          onKeyDown={handleTabKeyDown}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id
            const count = tabCounts[tab.id]
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={isSelected ? `panel-${tab.id}` : undefined}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                className="tab-btn"
              >
                {tab.renderIcon()}
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span className="tab-count-pill font-mono-num" aria-label={`${count} catatan`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Panel */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="animate-fade-up"
        key={activeTab}
      >
        {activeTab === 'panen' && <HarvestTab kaplingId={kaplingId} items={harvests} />}
        {activeTab === 'perawatan' && (
          <MaintenanceTab kaplingId={kaplingId} items={maintenance} typeOptions={maintenanceTypeOptions} />
        )}
        {activeTab === 'pengeluaran' && (
          <ExpenseTab kaplingId={kaplingId} items={expenses} categoryOptions={expenseCategoryOptions} />
        )}
        {activeTab === 'penjualan' && <SaleTab kaplingId={kaplingId} items={sales} />}
        {activeTab === 'laporan' && (
          <KaplingReport
            harvests={harvests}
            maintenance={maintenance}
            expenses={expenses}
            sales={sales}
            expenseCategoryOptions={expenseCategoryOptions}
          />
        )}
        {activeTab === 'pengaturan' && (
          <SettingsTab
            kaplingId={kaplingId}
            kaplingName={kaplingName}
            isActive={isActive}
            counts={{
              harvests: harvests.length,
              maintenance: maintenance.length,
              expenses: expenses.length,
              sales: sales.length,
            }}
          />
        )}
      </div>
    </div>
  )
}
