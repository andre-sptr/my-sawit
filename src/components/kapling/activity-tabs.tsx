'use client'

import { useState, useActionState, useRef, useEffect } from 'react'
import type { Expense, Harvest, Maintenance, Sale } from '@prisma/client'
import {
  createExpense, createHarvest, createMaintenance, createSale,
  deleteExpense, deleteHarvest, deleteMaintenance, deleteSale,
  updateExpense, updateHarvest, updateMaintenance, updateSale,
  deactivateKapling, updateKapling, addDropdownOption,
} from '@/app/actions'
import { formatCurrency, formatDate, formatKg, toDateInputValue } from '@/lib/date'
import { useFormStatus } from 'react-dom'
import type { ActionResult, DropdownItem } from '@/lib/types'

/* ─── Icons ─── */
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
}
function ChevronDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function EditIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function PhotoIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}

/* ─── Submit Button (reads useFormStatus) ─── */
function SubmitBtn({ label, pendingLabel }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary" style={{ width: '100%', height: 42, fontSize: 'calc(13px * var(--text-scale, 1))' }}>
      {pending ? (
        <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" /> {pendingLabel || 'Menyimpan...'}</>
      ) : label}
    </button>
  )
}

/* ─── Delete Button ─── */
function DeleteBtn({ label = 'Hapus', pendingLabel = 'Menghapus...', confirmMessage = 'Hapus data ini?' }: {
  label?: string; pendingLabel?: string; confirmMessage?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => { if (!window.confirm(confirmMessage)) e.preventDefault() }}
      className="btn-danger-outline"
      style={{ height: 32, fontSize: 'calc(12px * var(--text-scale, 1))', padding: '0 10px' }}
    >
      <TrashIcon />
      {pending ? pendingLabel : label}
    </button>
  )
}

/* ─── Input/Label CSS Classes ─── */
const inputCls = 'input-field'
const labelCls = 'input-label'

/* ─── Action Result Message ─── */
function ActionMsg({ state }: { state: ActionResult | null }) {
  if (!state) return null
  return (
    <p
      aria-live="polite"
      style={{
        margin: 0,
        fontSize: 'calc(12px * var(--text-scale, 1))',
        fontWeight: 600,
        color: state.ok ? 'var(--color-success)' : 'var(--color-danger)',
        padding: '6px 10px',
        borderRadius: 7,
        background: state.ok ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${state.ok ? '#bbf7d0' : '#fecaca'}`,
      }}
    >
      {state.message}
    </p>
  )
}

/* ─── Form Grid ─── */
function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid-form" style={{ background: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', padding: 14 }}>
      {children}
    </div>
  )
}

/* ─── Creatable Select (dropdown with "+ Tambah baru" option) ─── */
function CreatableSelect({
  name, options, group, defaultValue,
}: {
  name: string
  options: DropdownItem[]
  group: string // "maintenanceType" | "expenseCategory"
  defaultValue?: string
}) {
  const [items, setItems] = useState<DropdownItem[]>(options)
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
    const result = await addDropdownOption(null, fd)
    setSaving(false)
    if (result.ok) {
      const value = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
      const newItem = { value, label }
      setItems(prev => [...prev, newItem])
      setSelectedValue(value)
      setNewLabel('')
      setAdding(false)
    } else {
      setError(result.message)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <input type="hidden" name={name} value={selectedValue} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          className={inputCls}
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          style={{ flex: 1 }}
        >
          {items.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setAdding(v => !v)}
          title="Tambah opsi baru"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            border: '1px solid var(--color-border)',
            background: adding ? 'var(--color-primary)' : 'var(--color-surface)',
            color: adding ? '#fff' : 'var(--color-primary)',
            cursor: 'pointer', transition: 'all 0.15s',
            fontSize: 'calc(16px * var(--text-scale, 1))', fontWeight: 700,
          }}
        >
          {adding ? '×' : '+'}
        </button>
      </div>
      {adding && (
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center',
          animation: 'fadeUp 0.15s ease',
        }}>
          <input
            ref={inputRef}
            className={inputCls}
            type="text"
            placeholder="Nama opsi baru..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            style={{ flex: 1 }}
            disabled={saving}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newLabel.trim()}
            style={{
              padding: '0 12px', height: 36, borderRadius: 8,
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 600,
              cursor: saving || !newLabel.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !newLabel.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {saving ? '...' : 'Tambah'}
          </button>
        </div>
      )}
      {error && <p style={{ margin: 0, fontSize: 'calc(11px * var(--text-scale, 1))', color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}

/* ─── Collapsible Add Form ─── */
type SAction = (_prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>

function AddFormSection({
  title, action, resetOnSuccess = true, children,
}: {
  title: string
  action: SAction
  resetOnSuccess?: boolean
  children: (formAction: (formData: FormData) => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form on success
  useEffect(() => {
    if (state?.ok && resetOnSuccess) {
      formRef.current?.reset()
    }
  }, [state, resetOnSuccess])

  return (
    <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '11px 14px', background: 'var(--color-surface)',
          border: 'none', cursor: 'pointer', fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 600,
          color: open ? 'var(--color-primary)' : 'var(--color-ink)', gap: 8,
        }}
        id={`add-form-toggle-${title.replace(/\s+/g, '-').toLowerCase()}`}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><PlusIcon /> {title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><ChevronDownIcon /></span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)' }} className="animate-fade-up">
          <form ref={formRef} action={formAction}>
            {children(formAction)}
            {state && <div style={{ padding: '0 14px 14px' }}><ActionMsg state={state} /></div>}
          </form>
        </div>
      )}
    </div>
  )
}

/* ─── Inline Edit + Delete Actions ─── */
function ItemActions({
  editContent,
  deleteAction,
  deleteHiddenFields,
  confirmMessage = 'Hapus data ini?',
}: {
  editContent: React.ReactNode
  deleteAction: SAction
  deleteHiddenFields: { [key: string]: string }
  confirmMessage?: string
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteState, deleteFormAction] = useActionState(deleteAction, null)

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setEditOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 7,
            border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-muted)', fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          <EditIcon /> {editOpen ? 'Tutup' : 'Edit'}
        </button>
        <form action={deleteFormAction} style={{ display: 'inline' }}>
          {Object.entries(deleteHiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DeleteBtn confirmMessage={confirmMessage} />
        </form>
        {deleteState && !deleteState.ok && <span style={{ fontSize: 'calc(11px * var(--text-scale, 1))', color: 'var(--color-danger)' }}>{deleteState.message}</span>}
      </div>
      {editOpen && (
        <div style={{ marginTop: 10 }} className="animate-fade-up">
          {editContent}
        </div>
      )}
    </div>
  )
}

/* ─── Edit Form Wrapper ─── */
function EditForm({ action, children }: { action: SAction; children: React.ReactNode }) {
  const [state, formAction] = useActionState(action, null)
  return (
    <form action={formAction}>
      {children}
      {state && <div style={{ padding: '0 0 8px' }}><ActionMsg state={state} /></div>}
    </form>
  )
}

/* ─────────────── HARVEST TAB ─────────────── */
function HarvestTab({ kaplingId, items }: { kaplingId: string; items: Harvest[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <AddFormSection title="Tambah Panenan" action={createHarvest}>
        {() => (
          <FormGrid>
            <input type="hidden" name="kaplingId" value={kaplingId} />
            <label className={labelCls}>Tanggal Panen <input className={inputCls} type="date" name="harvestDate" required /></label>
            <label className={labelCls}>Berat (kg) <input className={inputCls} type="number" step="0.01" name="weightKg" required /></label>
            <label className={labelCls}>Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
            <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
            <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Simpan Panenan" /></div>
          </FormGrid>
        )}
      </AddFormSection>

      {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))', padding: '20px 0' }}>Belum ada data panenan.</p>}

      {items.map(item => (
        <article key={item.id} className="history-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <strong style={{ fontSize: 'calc(15px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>{formatKg(item.weightKg)}</strong>
            <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{formatDate(item.harvestDate)}</span>
          </div>
          {item.note && <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{item.note}</p>}
          {item.photoPath && <a href={item.photoPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-info)', marginTop: 4 }}><PhotoIcon /> Lihat foto</a>}
          <ItemActions
            deleteAction={deleteHarvest}
            deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
            confirmMessage="Hapus data panenan ini secara permanen?"
            editContent={
              <EditForm action={updateHarvest}>
                <FormGrid>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="kaplingId" value={item.kaplingId} />
                  <label className={labelCls}>Tanggal <input className={inputCls} type="date" name="harvestDate" defaultValue={toDateInputValue(item.harvestDate)} required /></label>
                  <label className={labelCls}>Berat (kg) <input className={inputCls} type="number" step="0.01" name="weightKg" defaultValue={item.weightKg} required /></label>
                  <label className={labelCls}>Ganti Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
                  <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} defaultValue={item.note ?? ''} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
                  <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Update Panenan" /></div>
                </FormGrid>
              </EditForm>
            }
          />
        </article>
      ))}
    </div>
  )
}

/* ─────────────── MAINTENANCE TAB ─────────────── */
const maintenanceTypeColors: Record<string, { bg: string; color: string }> = {
  SEMPROT: { bg: '#f0fdf4', color: '#16a34a' },
  BABAT: { bg: '#fffbeb', color: '#d97706' },
  PUPUK: { bg: '#eff6ff', color: '#2563eb' },
}

function MaintenanceTab({ kaplingId, items, typeOptions }: { kaplingId: string; items: Maintenance[]; typeOptions: DropdownItem[] }) {
  const typeLabel = Object.fromEntries(typeOptions.map(o => [o.value, o.label]))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <AddFormSection title="Tambah Perawatan" action={createMaintenance}>
        {() => (
          <FormGrid>
            <input type="hidden" name="kaplingId" value={kaplingId} />
            <label className={labelCls}>Tanggal <input className={inputCls} type="date" name="activityDate" required /></label>
            <label className={labelCls}>Jenis <CreatableSelect name="type" options={typeOptions} group="maintenanceType" /></label>
            <label className={labelCls}>Biaya (Rp) <input className={inputCls} type="number" step="1" name="cost" /></label>
            <label className={labelCls}>Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
            <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
            <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Simpan Perawatan" /></div>
          </FormGrid>
        )}
      </AddFormSection>

      {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))', padding: '20px 0' }}>Belum ada data perawatan.</p>}

      {items.map(item => {
        const tc = maintenanceTypeColors[item.type] ?? { bg: '#f3f4f6', color: '#6b7280' }
        return (
          <article key={item.id} className="history-item">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'calc(11px * var(--text-scale, 1))', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: tc.bg, color: tc.color }}>{typeLabel[item.type] ?? item.type}</span>
                {item.cost != null && <span style={{ fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.cost)}</span>}
              </div>
              <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{formatDate(item.activityDate)}</span>
            </div>
            {item.note && <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{item.note}</p>}
            {item.photoPath && <a href={item.photoPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-info)', marginTop: 4 }}><PhotoIcon /> Lihat foto</a>}
            <ItemActions
              deleteAction={deleteMaintenance}
              deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
              confirmMessage="Hapus data perawatan ini?"
              editContent={
                <EditForm action={updateMaintenance}>
                  <FormGrid>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="kaplingId" value={item.kaplingId} />
                    <label className={labelCls}>Tanggal <input className={inputCls} type="date" name="activityDate" defaultValue={toDateInputValue(item.activityDate)} required /></label>
                    <label className={labelCls}>Jenis <CreatableSelect name="type" options={typeOptions} group="maintenanceType" defaultValue={item.type} /></label>
                    <label className={labelCls}>Biaya (Rp) <input className={inputCls} type="number" step="1" name="cost" defaultValue={item.cost ?? ''} /></label>
                    <label className={labelCls}>Ganti Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
                    <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} defaultValue={item.note ?? ''} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
                    <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Update Perawatan" /></div>
                  </FormGrid>
                </EditForm>
              }
            />
          </article>
        )
      })}
    </div>
  )
}

/* ─────────────── EXPENSE TAB ─────────────── */
function ExpenseTab({ kaplingId, items, categoryOptions }: { kaplingId: string; items: Expense[]; categoryOptions: DropdownItem[] }) {
  const categoryLabel = Object.fromEntries(categoryOptions.map(o => [o.value, o.label]))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <AddFormSection title="Tambah Pengeluaran" action={createExpense}>
        {() => (
          <FormGrid>
            <input type="hidden" name="kaplingId" value={kaplingId} />
            <label className={labelCls}>Tanggal <input className={inputCls} type="date" name="expenseDate" required /></label>
            <label className={labelCls}>Kategori <CreatableSelect name="category" options={categoryOptions} group="expenseCategory" /></label>
            <label className={labelCls}>Nominal (Rp) <input className={inputCls} type="number" step="1" name="amount" required /></label>
            <label className={labelCls}>Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
            <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
            <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Simpan Pengeluaran" /></div>
          </FormGrid>
        )}
      </AddFormSection>

      {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))', padding: '20px 0' }}>Belum ada data pengeluaran.</p>}

      {items.map(item => (
        <article key={item.id} className="history-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 'calc(15px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount)}</strong>
              <span style={{ marginLeft: 8, fontSize: 'calc(11px * var(--text-scale, 1))', color: 'var(--color-muted)', background: '#f3f4f6', padding: '2px 7px', borderRadius: 99 }}>
                {categoryLabel[item.category] ?? item.category}
              </span>
            </div>
            <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{formatDate(item.expenseDate)}</span>
          </div>
          {item.note && <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{item.note}</p>}
          {item.photoPath && <a href={item.photoPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-info)', marginTop: 4 }}><PhotoIcon /> Lihat foto</a>}
          <ItemActions
            deleteAction={deleteExpense}
            deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
            confirmMessage="Hapus data pengeluaran ini?"
            editContent={
              <EditForm action={updateExpense}>
                <FormGrid>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="kaplingId" value={item.kaplingId} />
                  <label className={labelCls}>Tanggal <input className={inputCls} type="date" name="expenseDate" defaultValue={toDateInputValue(item.expenseDate)} required /></label>
                  <label className={labelCls}>Kategori <CreatableSelect name="category" options={categoryOptions} group="expenseCategory" defaultValue={item.category} /></label>
                  <label className={labelCls}>Nominal (Rp) <input className={inputCls} type="number" step="1" name="amount" defaultValue={item.amount} required /></label>
                  <label className={labelCls}>Ganti Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
                  <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} defaultValue={item.note ?? ''} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
                  <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Update Pengeluaran" /></div>
                </FormGrid>
              </EditForm>
            }
          />
        </article>
      ))}
    </div>
  )
}

/* ─────────────── SALE TAB ─────────────── */
function SaleTab({ kaplingId, items }: { kaplingId: string; items: Sale[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <AddFormSection title="Tambah Penjualan" action={createSale}>
        {() => (
          <FormGrid>
            <input type="hidden" name="kaplingId" value={kaplingId} />
            <label className={labelCls}>Tanggal Jual <input className={inputCls} type="date" name="saleDate" required /></label>
            <label className={labelCls}>Berat (kg) <input className={inputCls} type="number" step="0.01" name="weightKg" required /></label>
            <label className={labelCls}>Harga/kg (Rp) <input className={inputCls} type="number" step="1" name="pricePerKg" required /></label>
            <label className={labelCls}>Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
            <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
            <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Simpan Penjualan" /></div>
          </FormGrid>
        )}
      </AddFormSection>

      {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))', padding: '20px 0' }}>Belum ada data penjualan.</p>}

      {items.map(item => (
        <article key={item.id} className="history-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 'calc(15px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-harvest-ink)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.weightKg * item.pricePerKg)}</strong>
              <p style={{ margin: '2px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatKg(item.weightKg)} × {formatCurrency(item.pricePerKg)}/kg</p>
            </div>
            <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)', flexShrink: 0 }}>{formatDate(item.saleDate)}</span>
          </div>
          {item.note && <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{item.note}</p>}
          {item.photoPath && <a href={item.photoPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-info)', marginTop: 4 }}><PhotoIcon /> Lihat foto</a>}
          <ItemActions
            deleteAction={deleteSale}
            deleteHiddenFields={{ id: item.id, kaplingId: item.kaplingId }}
            confirmMessage="Hapus data penjualan ini?"
            editContent={
              <EditForm action={updateSale}>
                <FormGrid>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="kaplingId" value={item.kaplingId} />
                  <label className={labelCls}>Tanggal Jual <input className={inputCls} type="date" name="saleDate" defaultValue={toDateInputValue(item.saleDate)} required /></label>
                  <label className={labelCls}>Berat (kg) <input className={inputCls} type="number" step="0.01" name="weightKg" defaultValue={item.weightKg} required /></label>
                  <label className={labelCls}>Harga/kg (Rp) <input className={inputCls} type="number" step="1" name="pricePerKg" defaultValue={item.pricePerKg} required /></label>
                  <label className={labelCls}>Ganti Foto <input className={inputCls} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
                  <label className={labelCls} style={{ gridColumn: '1/-1' }}>Catatan <textarea className={inputCls} name="note" rows={2} defaultValue={item.note ?? ''} style={{ resize: 'vertical', paddingTop: 8 }} /></label>
                  <div style={{ gridColumn: '1/-1' }}><SubmitBtn label="Update Penjualan" /></div>
                </FormGrid>
              </EditForm>
            }
          />
        </article>
      ))}
    </div>
  )
}

/* ─────────────── SETTINGS TAB ─────────────── */
function SettingsTab({ kaplingId, kaplingName, isActive }: { kaplingId: string; kaplingName: string; isActive: boolean }) {
  const [renameState, renameAction] = useActionState(updateKapling, null)
  const [deactivateState, deactivateAction] = useActionState(deactivateKapling, null)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>Ubah Nama Kapling</h3>
        <form action={renameAction} style={{ display: 'grid', gap: 10 }}>
          <input type="hidden" name="id" value={kaplingId} />
          <label className={labelCls}>Nama Kapling <input className={inputCls} name="name" defaultValue={kaplingName} required /></label>
          <SubmitBtn label="Simpan Perubahan" />
        </form>
        <ActionMsg state={renameState} />
      </div>

      {isActive && (
        <div style={{ background: '#fff5f5', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-danger)' }}>Nonaktifkan Kapling</h3>
          <p style={{ margin: '0 0 12px', fontSize: 'calc(12px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>Data historis tetap tersimpan. Kapling tidak akan muncul di daftar aktif.</p>
          <form action={deactivateAction}>
            <input type="hidden" name="id" value={kaplingId} />
            <DeleteBtn label="Nonaktifkan Kapling" pendingLabel="Menonaktifkan..." confirmMessage="Nonaktifkan kapling ini? Data historis tetap tersimpan." />
          </form>
          <ActionMsg state={deactivateState} />
        </div>
      )}
    </div>
  )
}

/* ─────────────── LAPORAN TAB ─────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>{title}</h3>
      {subtitle && <p style={{ margin: '3px 0 0', fontSize: 'calc(11px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{subtitle}</p>}
    </div>
  )
}

function KpiCard({ label, value, sub, color = 'var(--color-ink)', bg = 'var(--color-surface)', icon }: {
  label: string; value: string; sub?: string; color?: string; bg?: string; icon: string
}) {
  return (
    <div style={{
      background: bg,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <span style={{ fontSize: 'calc(20px * var(--text-scale, 1))', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 'calc(10px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: '3px 0 0', fontSize: 'calc(15px * var(--text-scale, 1))', fontWeight: 700, color, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>{value}</p>
        {sub && <p style={{ margin: '3px 0 0', fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{sub}</p>}
      </div>
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function LaporanTab({ harvests, maintenance, expenses, sales }: {
  harvests: Harvest[]; maintenance: Maintenance[]; expenses: Expense[]; sales: Sale[]
}) {
  // ── Kalkulasi Total ──────────────────────────────────────
  const totalHarvestKg   = harvests.reduce((s, h) => s + h.weightKg, 0)
  const totalSaleVolume  = sales.reduce((s, x) => s + x.weightKg, 0)
  const totalRevenue     = sales.reduce((s, x) => s + x.weightKg * x.pricePerKg, 0)
  const totalMaintCost   = maintenance.reduce((s, m) => s + (m.cost ?? 0), 0)
  const totalExpAmt      = expenses.reduce((s, e) => s + e.amount, 0)
  const totalExpenses    = totalMaintCost + totalExpAmt
  const netProfit        = totalRevenue - totalExpenses
  const avgPricePerKg    = totalSaleVolume > 0 ? totalRevenue / totalSaleVolume : 0
  const costPerKg        = totalHarvestKg > 0 ? totalExpenses / totalHarvestKg : 0
  const profitMargin     = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const isProfit         = netProfit >= 0

  // Total gaji vs perawatan vs lain-lain
  const totalGaji        = expenses.filter(e => e.category === 'GAJI_KARYAWAN').reduce((s, e) => s + e.amount, 0)
  const totalLainlain    = expenses.filter(e => e.category === 'LAIN_LAIN').reduce((s, e) => s + e.amount, 0)
  const maxCostItem      = Math.max(totalGaji, totalMaintCost, totalLainlain)

  // ── Laporan Per Bulan ────────────────────────────────────
  type MonthData = {
    harvestKg: number; revenue: number; maintCost: number; expCost: number; saleCount: number; harvestCount: number
  }
  const monthMap = new Map<string, MonthData>()

  const getMonthKey = (date: Date) => {
    const d = new Date(date)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }
  const getOrCreate = (key: string): MonthData => {
    if (!monthMap.has(key)) monthMap.set(key, { harvestKg: 0, revenue: 0, maintCost: 0, expCost: 0, saleCount: 0, harvestCount: 0 })
    return monthMap.get(key)!
  }

  harvests.forEach(h    => { const m = getOrCreate(getMonthKey(h.harvestDate)); m.harvestKg += h.weightKg; m.harvestCount++ })
  sales.forEach(s       => { const m = getOrCreate(getMonthKey(s.saleDate));    m.revenue += s.weightKg * s.pricePerKg; m.saleCount++ })
  maintenance.forEach(m => { const mo = getOrCreate(getMonthKey(m.activityDate)); mo.maintCost += m.cost ?? 0 })
  expenses.forEach(e    => { const m = getOrCreate(getMonthKey(e.expenseDate)); m.expCost += e.amount })

  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // terbaru di atas
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number)
      const totalCost = data.maintCost + data.expCost
      const profit    = data.revenue - totalCost
      const label     = new Date(Date.UTC(year, month - 1, 15)).toLocaleString('id-ID', { month: 'long', year: 'numeric' })
      return { key, label, ...data, totalCost, profit }
    })

  // Max revenue untuk bar chart produksi
  const maxMonthRevenue = months.length > 0 ? Math.max(...months.map(m => m.revenue)) : 0
  const maxMonthHarvest = months.length > 0 ? Math.max(...months.map(m => m.harvestKg)) : 0

  if (harvests.length === 0 && sales.length === 0 && expenses.length === 0 && maintenance.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
        <div style={{ fontSize: 'calc(32px * var(--text-scale, 1))', marginBottom: 8 }}>📊</div>
        <p style={{ margin: 0, fontSize: 'calc(14px * var(--text-scale, 1))', fontWeight: 600 }}>Belum ada data untuk dilaporkan</p>
        <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--text-scale, 1))' }}>Mulai catat aktivitas di tab lain terlebih dahulu</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* ── 1. RINGKASAN FINANSIAL ── */}
      <section>
        <SectionHeader title="Ringkasan Finansial" subtitle="Akumulasi seluruh periode" />
        <div className="grid-stats-4">
          <KpiCard icon="💰" label="Total Pendapatan" value={formatCurrency(totalRevenue)}
            sub={`${sales.length} transaksi`} color="var(--color-harvest-ink)" bg="#fffbeb" />
          <KpiCard icon="📋" label="Total Pengeluaran" value={formatCurrency(totalExpenses)}
            sub={`${maintenance.length + expenses.length} entri biaya`} color="#6b7280" />
          <KpiCard icon={isProfit ? '📈' : '📉'} label="Laba Bersih" value={formatCurrency(netProfit)}
            sub={`Margin ${profitMargin.toFixed(1)}%`}
            color={isProfit ? 'var(--color-success)' : 'var(--color-danger)'}
            bg={isProfit ? '#f0fdf4' : '#fef2f2'} />
          <KpiCard icon="🌿" label="Total Panen" value={formatKg(totalHarvestKg)}
            sub={`${harvests.length} kali panen`} color="var(--color-primary)" bg="#f0fdf4" />
        </div>
      </section>

      {/* ── 2. KPI OPERASIONAL ── */}
      <section>
        <SectionHeader title="Indikator Kinerja Utama" subtitle="Efisiensi operasional kebun" />
        <div className="grid-stats-4">
          <KpiCard icon="⚖️" label="Harga Jual Rata-rata" value={avgPricePerKg > 0 ? `Rp ${Math.round(avgPricePerKg).toLocaleString('id-ID')}/kg` : '—'}
            sub="" />
          <KpiCard icon="🧮" label="Biaya per kg Panen" value={costPerKg > 0 ? `Rp ${Math.round(costPerKg).toLocaleString('id-ID')}/kg` : '—'}
            sub="" color={costPerKg < avgPricePerKg ? 'var(--color-success)' : 'var(--color-danger)'} />
          <KpiCard icon="📦" label="Volume Terjual" value={formatKg(totalSaleVolume)}
            sub={`${sales.length} transaksi jual`} />
          <KpiCard icon="🔄" label="Rasio Jual/Panen"
            value={totalHarvestKg > 0 ? `${((totalSaleVolume / totalHarvestKg) * 100).toFixed(1)}%` : '—'}
            sub=""
            color={totalSaleVolume / totalHarvestKg >= 0.95 ? 'var(--color-success)' : 'var(--color-warning)'} />
        </div>
      </section>

      {/* ── 3. KOMPOSISI BIAYA ── */}
      <section>
        <SectionHeader title="Komposisi Biaya" subtitle="Breakdown pengeluaran per kategori" />
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'grid',
          gap: 14,
        }}>
          {[
            { label: 'Gaji Karyawan', value: totalGaji, color: '#6366f1', icon: '👷' },
            { label: 'Biaya Perawatan', value: totalMaintCost, color: '#f59e0b', icon: '🔧' },
            { label: 'Lain-lain', value: totalLainlain, color: '#6b7280', icon: '📦' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 'calc(13px * var(--text-scale, 1))' }}>{item.icon}</span>
                  <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 600, color: 'var(--color-ink)' }}>{item.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.value)}</span>
                  <span style={{ fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)', marginLeft: 6 }}>
                    {totalExpenses > 0 ? `${((item.value / totalExpenses) * 100).toFixed(0)}%` : '0%'}
                  </span>
                </div>
              </div>
              <ProgressBar value={item.value} max={maxCostItem || 1} color={item.color} />
            </div>
          ))}
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)' }}>Total Pengeluaran</span>
            <span style={{ fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </section>

      {/* ── 4. LAPORAN PER BULAN ── */}
      <section>
        <SectionHeader title="Laporan Bulanan" subtitle="Rincian finansial tiap bulan (terbaru di atas)" />
        {months.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: 'calc(13px * var(--text-scale, 1))' }}>Belum ada data bulanan.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {months.map((m, i) => {
              const isMonthProfit = m.profit >= 0
              return (
                <div
                  key={m.key}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    animationDelay: `${i * 40}ms`,
                  }}
                  className="animate-fade-up"
                >
                  {/* Header bulan */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: isMonthProfit ? '#f0fdf4' : '#fef2f2',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <span style={{ fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'capitalize' }}>{m.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{m.harvestCount} panen · {m.saleCount} jual</span>
                      <span style={{
                        fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 700,
                        color: isMonthProfit ? 'var(--color-success)' : 'var(--color-danger)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {isMonthProfit ? '+' : ''}{formatCurrency(m.profit)}
                      </span>
                    </div>
                  </div>
                  {/* Detail baris */}
                  <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)', fontWeight: 600 }}>PANEN</p>
                      <p style={{ margin: '3px 0 0', fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.harvestKg > 0 ? formatKg(m.harvestKg) : '—'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                      <p style={{ margin: 0, fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)', fontWeight: 600 }}>OMSET</p>
                      <p style={{ margin: '3px 0 0', fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-harvest-ink)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.revenue > 0 ? formatCurrency(m.revenue) : '—'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)', fontWeight: 600 }}>BIAYA</p>
                      <p style={{ margin: '3px 0 0', fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.totalCost > 0 ? formatCurrency(m.totalCost) : '—'}
                      </p>
                    </div>
                  </div>
                  {/* Revenue bar */}
                  {m.revenue > 0 && (
                    <div style={{ padding: '0 14px 10px' }}>
                      <ProgressBar value={m.revenue} max={maxMonthRevenue} color={isMonthProfit ? '#16a34a' : '#dc2626'} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 5. VOLUME PRODUKSI ── */}
      {months.some(m => m.harvestKg > 0) && (
        <section>
          <SectionHeader title="Tren Volume Panen" subtitle="Perbandingan hasil panen antar bulan (kg)" />
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            display: 'grid',
            gap: 10,
          }}>
            {[...months].reverse().map(m => (
              m.harvestKg > 0 && (
                <div key={m.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 'calc(11px * var(--text-scale, 1))', fontWeight: 600, color: 'var(--color-ink)', textTransform: 'capitalize', minWidth: 100 }}>{m.label}</span>
                    <span style={{ fontSize: 'calc(11px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatKg(m.harvestKg)}</span>
                  </div>
                  <ProgressBar value={m.harvestKg} max={maxMonthHarvest} color="#16a34a" />
                </div>
              )
            ))}
          </div>
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
  harvests: Harvest[]
  maintenance: Maintenance[]
  expenses: Expense[]
  sales: Sale[]
  maintenanceTypeOptions: DropdownItem[]
  expenseCategoryOptions: DropdownItem[]
}

const TABS = [
  { id: 'panen',       label: '🌿 Panen' },
  { id: 'perawatan',   label: '🔧 Perawatan' },
  { id: 'pengeluaran', label: '💸 Pengeluaran' },
  { id: 'penjualan',   label: '💰 Penjualan' },
  { id: 'laporan',     label: '📊 Laporan' },
  { id: 'pengaturan',  label: '⚙️ Pengaturan' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ActivityTabs({ kaplingId, kaplingName, isActive, harvests, maintenance, expenses, sales, maintenanceTypeOptions, expenseCategoryOptions }: ActivityTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('panen')

  return (
    <div>
      {/* Tab Bar */}
      <div style={{ overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
        <div
          role="tablist"
          aria-label="Aktivitas kapling"
          style={{
            display: 'flex',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 4,
            gap: 2,
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 'calc(12px * var(--text-scale, 1))',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                border: 'none',
                background: activeTab === tab.id ? 'var(--color-surface)' : 'transparent',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
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
        {activeTab === 'panen'       && <HarvestTab     kaplingId={kaplingId} items={harvests} />}
        {activeTab === 'perawatan'   && <MaintenanceTab kaplingId={kaplingId} items={maintenance} typeOptions={maintenanceTypeOptions} />}
        {activeTab === 'pengeluaran' && <ExpenseTab     kaplingId={kaplingId} items={expenses} categoryOptions={expenseCategoryOptions} />}
        {activeTab === 'penjualan'   && <SaleTab        kaplingId={kaplingId} items={sales} />}
        {activeTab === 'laporan'     && <LaporanTab     harvests={harvests} maintenance={maintenance} expenses={expenses} sales={sales} />}
        {activeTab === 'pengaturan'  && <SettingsTab    kaplingId={kaplingId} kaplingName={kaplingName} isActive={isActive} />}
      </div>
    </div>
  )
}
