import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { sendDocument, sendMessage, sendPhoto } from '@/lib/telegram'
import { buildSaleInvoicePdf } from '@/lib/invoice-pdf'
import { formatCurrency, formatDate, formatKg, toDateInputValue } from '@/lib/date'
import { expenseCategories, maintenanceTypes } from '@/lib/types'

const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'Rekapal'

// Node.js Intl may insert a non-breaking space (U+00A0) between the currency
// symbol and the number. Strip it so that Telegram caption strings are
// consistent across environments (tests assert 'Rp250.000' without any space).
function fc(value: number) {
  //   = non-breaking space that id-ID locale inserts after 'Rp'
  return formatCurrency(value).replace(/ /g, '')
}

export type SaleInput = {
  id: string
  kaplingName: string
  saleDate: Date
  weightKg: number
  pricePerKg: number
  note?: string | null
  photoPath?: string | null
}

export type ExpenseInput = {
  kaplingName: string
  expenseDate: Date
  category: string
  amount: number
  photoPath?: string | null
}

export type MaintenanceInput = {
  kaplingName: string
  activityDate: Date
  type: string
  cost?: number | null
  photoPath?: string | null
}

export type HarvestInput = {
  kaplingName: string
  harvestDate: Date
  weightKg: number
  note?: string | null
  photoPath?: string | null
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function categoryLabel(value: string) {
  return expenseCategories.find((c) => c.value === value)?.label ?? value
}

function typeLabel(value: string) {
  return maintenanceTypes.find((t) => t.value === value)?.label ?? value
}

export function buildInvoiceNumber(record: { id: string; saleDate: Date }) {
  const ymd = toDateInputValue(record.saleDate).replaceAll('-', '')
  const suffix = record.id.slice(-4).toUpperCase()
  return `INV-${ymd}-${suffix}`
}

// ── pure message builders ────────────────────────────────────────────
export function saleCaption(sale: SaleInput, invoiceNumber: string, kind: 'baru' | 'revisi') {
  const total = sale.weightKg * sale.pricePerKg
  const name = escapeHtml(sale.kaplingName)
  const head = kind === 'baru' ? '\u{1F4B0} <b>Penjualan baru</b>' : '✏️ <b>Penjualan diperbarui</b>'
  const tail =
    kind === 'baru'
      ? `\u{1F4C4} Invoice ${invoiceNumber} terlampir`
      : `\u{1F4C4} Invoice ${invoiceNumber} (revisi) terlampir`
  return (
    `${head} — ${name}\n` +
    `${formatKg(sale.weightKg)} × ${fc(sale.pricePerKg)}/kg = <b>${fc(total)}</b> · ${formatDate(sale.saleDate)}\n` +
    tail
  )
}

export function saleDeletedText(sale: SaleInput) {
  const total = sale.weightKg * sale.pricePerKg
  return `\u{1F5D1}️ <b>Penjualan dihapus</b> — ${escapeHtml(sale.kaplingName)}: ${formatKg(sale.weightKg)} (${fc(total)}), ${formatDate(sale.saleDate)}`
}

export function expenseTextMessage(e: ExpenseInput, action: 'baru' | 'diperbarui' | 'dihapus') {
  const icon = action === 'dihapus' ? '\u{1F5D1}️' : action === 'diperbarui' ? '✏️' : '\u{1F9FE}'
  const amount = action === 'dihapus' ? fc(e.amount) : `<b>${fc(e.amount)}</b>`
  return `${icon} <b>Pengeluaran ${action}</b> (${categoryLabel(e.category)}) — ${escapeHtml(e.kaplingName)}: ${amount} · ${formatDate(e.expenseDate)}`
}

export function maintenanceTextMessage(m: MaintenanceInput, action: 'baru' | 'diperbarui' | 'dihapus') {
  const icon = action === 'dihapus' ? '\u{1F5D1}️' : action === 'diperbarui' ? '✏️' : '\u{1F6E0}️'
  const cost =
    m.cost == null
      ? 'tanpa biaya'
      : action === 'dihapus'
        ? fc(m.cost)
        : `<b>${fc(m.cost)}</b>`
  return `${icon} <b>Perawatan ${action}</b> (${typeLabel(m.type)}) — ${escapeHtml(m.kaplingName)}: ${cost} · ${formatDate(m.activityDate)}`
}

export function harvestTextMessage(h: HarvestInput, action: 'baru' | 'diperbarui' | 'dihapus') {
  const icon = action === 'dihapus' ? '\u{1F5D1}️' : action === 'diperbarui' ? '✏️' : '\u{1F33F}'
  const weight = action === 'dihapus' ? formatKg(h.weightKg) : `<b>${formatKg(h.weightKg)}</b>`
  return `${icon} <b>Panen ${action}</b> — ${escapeHtml(h.kaplingName)}: ${weight} · ${formatDate(h.harvestDate)}`
}

// ── safety wrapper: notify must never throw ──────────────────────────
async function guard(label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (error) {
    console.warn(`[notify] ${label} gagal:`, error instanceof Error ? error.message : error)
  }
}

// Foto disimpan di public/uploads/<filename>. Baca dari disk lalu kirim
// sebagai attachment. Bila file hilang / path salah, fallback ke pesan teks.
async function sendPhotoOrText(photoPath: string | null | undefined, caption: string) {
  if (!photoPath) {
    await sendMessage(caption)
    return
  }
  try {
    const safe = photoPath.replace(/^\/+/, '')
    if (!safe.startsWith('uploads/')) throw new Error('unexpected photo path')
    const abs = path.join(process.cwd(), 'public', safe)
    const bytes = await readFile(abs)
    const ext = path.extname(safe).toLowerCase()
    const mime =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    await sendPhoto(bytes, path.basename(safe), caption, mime)
  } catch (error) {
    console.warn('[notify] photo fallback ke teks:', error instanceof Error ? error.message : error)
    await sendMessage(caption)
  }
}

async function sendSaleInvoice(sale: SaleInput, kind: 'baru' | 'revisi') {
  const invoiceNumber = buildInvoiceNumber(sale)
  const total = sale.weightKg * sale.pricePerKg
  const pdf = await buildSaleInvoicePdf({
    invoiceNumber,
    businessName: BUSINESS_NAME,
    kaplingName: sale.kaplingName,
    saleDate: sale.saleDate,
    weightKg: sale.weightKg,
    pricePerKg: sale.pricePerKg,
    total,
    note: sale.note ?? null,
    isRevision: kind === 'revisi',
  })
  await sendDocument(pdf, `${invoiceNumber}.pdf`, saleCaption(sale, invoiceNumber, kind))
}

// ── orchestrators (consumed by server actions) ───────────────────────
export async function notifySaleCreated(sale: SaleInput) {
  await guard('sale.created', () => sendSaleInvoice(sale, 'baru'))
}
export async function notifySaleUpdated(sale: SaleInput) {
  await guard('sale.updated', () => sendSaleInvoice(sale, 'revisi'))
}
export async function notifySaleDeleted(sale: SaleInput) {
  await guard('sale.deleted', () => sendMessage(saleDeletedText(sale)))
}
export async function notifyExpenseCreated(e: ExpenseInput) {
  await guard('expense.created', () => sendPhotoOrText(e.photoPath, expenseTextMessage(e, 'baru')))
}
export async function notifyExpenseUpdated(e: ExpenseInput) {
  await guard('expense.updated', () => sendPhotoOrText(e.photoPath, expenseTextMessage(e, 'diperbarui')))
}
export async function notifyExpenseDeleted(e: ExpenseInput) {
  await guard('expense.deleted', () => sendMessage(expenseTextMessage(e, 'dihapus')))
}
export async function notifyMaintenanceCreated(m: MaintenanceInput) {
  await guard('maintenance.created', () => sendPhotoOrText(m.photoPath, maintenanceTextMessage(m, 'baru')))
}
export async function notifyMaintenanceUpdated(m: MaintenanceInput) {
  await guard('maintenance.updated', () => sendPhotoOrText(m.photoPath, maintenanceTextMessage(m, 'diperbarui')))
}
export async function notifyMaintenanceDeleted(m: MaintenanceInput) {
  await guard('maintenance.deleted', () => sendMessage(maintenanceTextMessage(m, 'dihapus')))
}
export async function notifyHarvestCreated(h: HarvestInput) {
  await guard('harvest.created', () => sendPhotoOrText(h.photoPath, harvestTextMessage(h, 'baru')))
}
export async function notifyHarvestUpdated(h: HarvestInput) {
  await guard('harvest.updated', () => sendPhotoOrText(h.photoPath, harvestTextMessage(h, 'diperbarui')))
}
export async function notifyHarvestDeleted(h: HarvestInput) {
  await guard('harvest.deleted', () => sendMessage(harvestTextMessage(h, 'dihapus')))
}
