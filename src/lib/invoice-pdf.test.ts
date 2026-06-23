import { describe, expect, it } from 'vitest'
import { buildSaleInvoicePdf } from '@/lib/invoice-pdf'

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

describe('buildSaleInvoicePdf', () => {
  it('menghasilkan byte PDF valid', async () => {
    const bytes = await buildSaleInvoicePdf(base)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('varian revisi + catatan + nama non-latin tidak error', async () => {
    const bytes = await buildSaleInvoicePdf({
      ...base,
      isRevision: true,
      note: 'lunas tunai ✅',
      kaplingName: 'Kebun Émas 🌴',
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
  })
})
