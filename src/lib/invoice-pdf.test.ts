import { afterEach, describe, expect, it } from 'vitest'
import { buildSaleInvoicePdf, __internal } from '@/lib/invoice-pdf'

const base = {
  invoiceNumber: 'INV-20260623-ABCD',
  businessName: 'Rekapal',
  kaplingName: 'Kapling 1',
  saleDate: new Date('2026-06-23T03:00:00Z'),
  weightKg: 100,
  pricePerKg: 2500,
  total: 250000,
  note: null as string | null,
  isRevision: false,
}

const ORIG_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIG_TZ
})

describe('buildSaleInvoicePdf', () => {
  it('menghasilkan byte PDF valid', async () => {
    const bytes = await buildSaleInvoicePdf(base)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(1800)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('normalisasi branding PDF memakai Rekapal, bukan mySawit', () => {
    expect(__internal.normalizeBusinessName('mySawit')).toBe('Rekapal')
    expect(__internal.normalizeBusinessName('my-sawit')).toBe('Rekapal')
    expect(__internal.normalizeBusinessName('')).toBe('Rekapal')
  })

  it('label kapling tidak menggandakan kata Kapling', () => {
    expect(__internal.formatKaplingSubtitle('Kapling Demo Barat')).toBe('Kapling Demo Barat')
    expect(__internal.formatKaplingSubtitle('Demo Barat')).toBe('Kapling Demo Barat')
  })

  it('varian revisi + catatan + nama non-latin tidak error', async () => {
    const bytes = await buildSaleInvoicePdf({
      ...base,
      isRevision: true,
      note: 'lunas tunai ✅\nbaris kedua\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      kaplingName: 'Kebun Émas 🌴',
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it('computeAlignedX memusatkan teks untuk align center', () => {
    expect(__internal.computeAlignedX(500, 40, 'center')).toBe(480)
    expect(__internal.computeAlignedX(500, 40, 'right')).toBe(460)
    expect(__internal.computeAlignedX(500, 40, 'left')).toBe(500)
  })

  it('wrapTextLines mempertahankan baris baru dan memecah kata panjang', () => {
    const measure = (s: string) => s.length * 6
    const lines = __internal.wrapTextLines('Baris 1\nBaris 2 sangatpanjangsekali', 60, measure)
    expect(lines[0]).toBe('Baris 1')
    expect(lines.length).toBeGreaterThan(2)
    expect(lines.every((l) => measure(l) <= 60)).toBe(true)
  })

  it('memformat tanggal pada PDF menggunakan Jakarta meski TZ=UTC', async () => {
    process.env.TZ = 'UTC'
    const bytes = await buildSaleInvoicePdf({
      ...base,
      saleDate: new Date('2026-06-30T17:00:00.000Z'), // 01 Jul 2026 WIB
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
  })
})
