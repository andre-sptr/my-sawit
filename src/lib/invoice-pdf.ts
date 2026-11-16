import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatCurrency, formatDate, formatKg } from '@/lib/date'

export type SaleInvoiceInput = {
  invoiceNumber: string
  businessName: string
  kaplingName: string
  saleDate: Date
  weightKg: number
  pricePerKg: number
  total: number
  note?: string | null
  isRevision: boolean
}

const BRAND_NAME = 'Rekapal'

// Helvetica (WinAnsi) cannot encode characters outside 0x00-0xFF.
const winAnsiSafe = (s: string) => s.replace(/[^\x00-\xFF]/g, '?')

function normalizeBusinessName(name: string | null | undefined) {
  const trimmed = name?.trim()
  if (!trimmed) return BRAND_NAME
  const compact = trimmed.toLowerCase().replace(/[\s_-]+/g, '')
  return compact === 'mysawit' ? BRAND_NAME : trimmed
}

function formatKaplingSubtitle(name: string) {
  const trimmed = name.trim()
  return /^kapling\b/i.test(trimmed) ? trimmed : `Kapling ${trimmed}`
}

function computeAlignedX(x: number, textWidth: number, align: 'left' | 'center' | 'right' = 'left') {
  if (align === 'right') return x - textWidth
  if (align === 'center') return x - textWidth / 2
  return x
}

function breakLongWord(word: string, maxWidth: number, measure: (s: string) => number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const ch of word) {
    const next = current + ch
    if (current && measure(next) > maxWidth) {
      chunks.push(current)
      current = ch
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function wrapTextLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const paragraphs = winAnsiSafe(text).split(/\r?\n/)
  const lines: string[] = []

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        current = candidate
        continue
      }
      if (current) {
        lines.push(current)
        current = ''
      }
      if (measure(word) <= maxWidth) {
        current = word
      } else {
        const parts = breakLongWord(word, maxWidth, measure)
        lines.push(...parts.slice(0, -1))
        current = parts[parts.length - 1] ?? ''
      }
    }
    if (current) lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

export async function buildSaleInvoicePdf(input: SaleInvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4 portrait (points)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  const businessName = normalizeBusinessName(input.businessName)
  doc.setTitle(`${input.invoiceNumber} - ${businessName}`)
  doc.setAuthor(businessName)
  doc.setSubject('Invoice Penjualan')
  doc.setCreator(BRAND_NAME)
  doc.setProducer(BRAND_NAME)

  const margin = 46
  const pageRight = width - margin
  const ink = rgb(0.08, 0.11, 0.13)
  const muted = rgb(0.36, 0.42, 0.46)
  const soft = rgb(0.93, 0.96, 0.94)
  const border = rgb(0.82, 0.87, 0.84)
  const brand = rgb(0.04, 0.35, 0.22)
  const brandDark = rgb(0.02, 0.22, 0.15)
  const accent = rgb(0.69, 0.53, 0.18)
  const danger = rgb(0.68, 0.16, 0.16)
  let y = height - margin

  type TextOptions = {
    size?: number
    bold?: boolean
    color?: ReturnType<typeof rgb>
    align?: 'left' | 'center' | 'right'
  }

  const textWidth = (text: string, size: number, useBold = false) =>
    (useBold ? bold : font).widthOfTextAtSize(winAnsiSafe(text), size)

  const drawText = (text: string, x: number, baseline: number, opts: TextOptions = {}) => {
    const size = opts.size ?? 10.5
    const useBold = opts.bold ?? false
    const safe = winAnsiSafe(text)
    const drawX = computeAlignedX(x, textWidth(safe, size, useBold), opts.align)
    page.drawText(safe, {
      x: drawX,
      y: baseline,
      size,
      font: useBold ? bold : font,
      color: opts.color ?? ink,
    })
  }

  const drawLabelValue = (label: string, value: string, x: number, baseline: number, labelWidth = 78) => {
    drawText(label.toUpperCase(), x, baseline, { size: 7.5, bold: true, color: muted })
    drawText(value, x + labelWidth, baseline - 1, { size: 10.5, bold: true, color: ink })
  }

  const card = (x: number, top: number, w: number, h: number, fill = rgb(1, 1, 1)) => {
    page.drawRectangle({ x, y: top - h, width: w, height: h, color: fill })
    page.drawRectangle({
      x,
      y: top - h,
      width: w,
      height: h,
      borderColor: border,
      borderWidth: 0.8,
    })
  }

  // Header band
  page.drawRectangle({ x: 0, y: height - 142, width, height: 142, color: brandDark })
  page.drawRectangle({ x: 0, y: height - 142, width: 12, height: 142, color: accent })
  page.drawCircle({ x: margin + 18, y: height - 66, size: 18, color: rgb(1, 1, 1) })
  const monogram = (winAnsiSafe(businessName)[0] ?? 'R').toUpperCase()
  drawText(monogram, margin + 18, height - 74, { size: 22, bold: true, color: brandDark, align: 'center' })
  drawText(businessName, margin + 48, height - 58, { size: 22, bold: true, color: rgb(1, 1, 1) })
  drawText('Manajemen hasil panen kelapa sawit', margin + 48, height - 79, {
    size: 9.5,
    color: rgb(0.82, 0.9, 0.86),
  })
  drawText('INVOICE PENJUALAN', pageRight, height - 58, {
    size: 18,
    bold: true,
    color: rgb(1, 1, 1),
    align: 'right',
  })
  drawText(input.invoiceNumber, pageRight, height - 80, {
    size: 10,
    color: rgb(0.82, 0.9, 0.86),
    align: 'right',
  })
  if (input.isRevision) {
    page.drawRectangle({ x: pageRight - 78, y: height - 113, width: 78, height: 24, color: rgb(1, 0.92, 0.9) })
    drawText('REVISI', pageRight - 39, height - 105, { size: 10, bold: true, color: danger, align: 'center' })
  }

  y = height - 174

  // Summary cards
  const leftCardW = 306
  const rightCardW = width - margin * 2 - leftCardW - 16
  card(margin, y, leftCardW, 104)
  card(margin + leftCardW + 16, y, rightCardW, 104, soft)
  drawText('Detail Transaksi', margin + 18, y - 26, { size: 13, bold: true, color: brand })
  drawLabelValue('Kapling', input.kaplingName, margin + 18, y - 52)
  drawLabelValue('Tanggal', formatDate(input.saleDate), margin + 18, y - 78)
  drawText('Total Tagihan', pageRight - 18, y - 29, { size: 9, bold: true, color: muted, align: 'right' })
  drawText(formatCurrency(input.total), pageRight - 18, y - 64, {
    size: 21,
    bold: true,
    color: brand,
    align: 'right',
  })
  drawText('Kuantitas dan nilai penjualan.', pageRight - 18, y - 85, {
    size: 8.5,
    color: muted,
    align: 'right',
  })

  y -= 134

  // Item table
  drawText('Rincian Penjualan', margin, y, { size: 13, bold: true, color: ink })
  y -= 26
  page.drawRectangle({ x: margin, y: y - 28, width: width - margin * 2, height: 28, color: brand })
  drawText('Keterangan', margin + 16, y - 18, { size: 9, bold: true, color: rgb(1, 1, 1) })
  drawText('Berat', margin + 290, y - 18, { size: 9, bold: true, color: rgb(1, 1, 1), align: 'right' })
  drawText('Harga / kg', margin + 400, y - 18, { size: 9, bold: true, color: rgb(1, 1, 1), align: 'right' })
  drawText('Subtotal', pageRight - 16, y - 18, { size: 9, bold: true, color: rgb(1, 1, 1), align: 'right' })
  y -= 28
  page.drawRectangle({ x: margin, y: y - 58, width: width - margin * 2, height: 58, color: rgb(1, 1, 1) })
  page.drawRectangle({
    x: margin,
    y: y - 58,
    width: width - margin * 2,
    height: 58,
    borderColor: border,
    borderWidth: 0.8,
  })
  drawText('Penjualan hasil panen', margin + 16, y - 24, { size: 11, bold: true })
  drawText(formatKaplingSubtitle(input.kaplingName), margin + 16, y - 43, { size: 8.5, color: muted })
  drawText(formatKg(input.weightKg), margin + 290, y - 31, { size: 10, align: 'right' })
  drawText(formatCurrency(input.pricePerKg), margin + 400, y - 31, { size: 10, align: 'right' })
  drawText(formatCurrency(input.total), pageRight - 16, y - 31, { size: 10, bold: true, align: 'right' })
  y -= 84

  // Total block
  page.drawRectangle({ x: width - margin - 232, y: y - 82, width: 232, height: 82, color: soft })
  page.drawRectangle({
    x: width - margin - 232,
    y: y - 82,
    width: 232,
    height: 82,
    borderColor: border,
    borderWidth: 0.8,
  })
  drawText('Subtotal', width - margin - 216, y - 25, { size: 9, color: muted })
  drawText(formatCurrency(input.total), pageRight - 16, y - 25, { size: 9.5, align: 'right' })
  page.drawLine({
    start: { x: width - margin - 216, y: y - 43 },
    end: { x: pageRight - 16, y: y - 43 },
    thickness: 0.8,
    color: border,
  })
  drawText('TOTAL', width - margin - 216, y - 65, { size: 11, bold: true, color: brand })
  drawText(formatCurrency(input.total), pageRight - 16, y - 66, {
    size: 15,
    bold: true,
    color: brand,
    align: 'right',
  })

  if (input.note) {
    const noteTop = y - 108
    const noteLines = wrapTextLines(input.note, width - margin * 2 - 32, (s) => textWidth(s, 9.5)).slice(0, 6)
    const noteHeight = Math.max(78, 44 + noteLines.length * 14 + 12)
    card(margin, noteTop, width - margin * 2, noteHeight, rgb(0.99, 0.99, 0.98))
    drawText('Catatan', margin + 16, noteTop - 24, { size: 10, bold: true, color: brand })
    noteLines.forEach((line, index) => {
      drawText(line, margin + 16, noteTop - 44 - index * 14, { size: 9.5, color: muted })
    })
  }

  // Footer
  page.drawLine({
    start: { x: margin, y: margin + 38 },
    end: { x: pageRight, y: margin + 38 },
    thickness: 0.8,
    color: border,
  })
  drawText('Dokumen dibuat otomatis oleh Rekapal.', margin, margin + 18, { size: 8.5, color: muted })
  drawText('Invoice ini sah sebagai catatan transaksi internal.', pageRight, margin + 18, {
    size: 8.5,
    color: muted,
    align: 'right',
  })

  return doc.save()
}

export const __internal = { formatKaplingSubtitle, normalizeBusinessName, computeAlignedX, wrapTextLines }
