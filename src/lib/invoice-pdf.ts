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

// Helvetica (WinAnsi) tidak bisa encode char di luar 0x00–0xFF (mis. emoji).
// Ganti dengan '?' agar render tidak pernah crash.
const winAnsiSafe = (s: string) => s.replace(/[^\x00-\xFF]/g, '?')

export async function buildSaleInvoicePdf(input: SaleInvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4 portrait (points)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const margin = 50
  const dark = rgb(0.1, 0.1, 0.1)
  const muted = rgb(0.4, 0.4, 0.4)
  const valueX = width - margin - 140

  let y = height - margin
  const line = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
  ) => {
    page.drawText(winAnsiSafe(text), {
      x: opts.x ?? margin,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? bold : font,
      color: opts.color ?? dark,
    })
  }
  const gap = (n = 18) => {
    y -= n
  }
  const rule = () =>
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: muted,
    })

  // Header
  line(input.businessName, { size: 20, bold: true })
  gap(26)
  line('INVOICE PENJUALAN', { size: 13, bold: true, color: muted })
  if (input.isRevision) {
    page.drawText('REVISI', {
      x: width - margin - 70,
      y,
      size: 13,
      font: bold,
      color: rgb(0.8, 0.2, 0.2),
    })
  }
  gap(30)

  // Meta
  line(`No. Invoice : ${input.invoiceNumber}`)
  gap()
  line(`Tanggal     : ${formatDate(input.saleDate)}`)
  gap(30)

  // Table
  line('Keterangan', { bold: true })
  line('Jumlah', { bold: true, x: valueX })
  gap(8)
  rule()
  gap(18)
  const row = (label: string, value: string) => {
    line(label)
    line(value, { x: valueX })
    gap()
  }
  row('Kapling', input.kaplingName)
  row('Berat panen', formatKg(input.weightKg))
  row('Harga per kg', formatCurrency(input.pricePerKg))
  gap(6)
  rule()
  gap(22)
  line('TOTAL', { bold: true, size: 13 })
  line(formatCurrency(input.total), { bold: true, size: 13, x: valueX })
  gap(34)

  if (input.note) {
    line('Catatan:', { bold: true })
    gap()
    line(input.note, { color: muted })
  }

  // Footer
  y = margin
  line('Dokumen dibuat otomatis oleh mySawit.', { size: 9, color: muted })

  return doc.save()
}
