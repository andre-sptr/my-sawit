import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/telegram', () => ({
  sendMessage: vi.fn(async () => {}),
  sendDocument: vi.fn(async () => {}),
  sendPhoto: vi.fn(async () => {}),
}))
vi.mock('@/lib/invoice-pdf', () => ({
  buildSaleInvoicePdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
}))

import * as telegram from '@/lib/telegram'
import { buildSaleInvoicePdf } from '@/lib/invoice-pdf'
import {
  buildInvoiceNumber,
  notifyExpenseCreated,
  notifyHarvestCreated,
  notifyHarvestDeleted,
  notifyMaintenanceCreated,
  notifySaleCreated,
  notifySaleDeleted,
} from '@/lib/notify'

const sale = {
  id: 'clxyzabcd',
  kaplingName: 'Kapling 1',
  saleDate: new Date('2026-06-23T03:00:00Z'),
  weightKg: 100,
  pricePerKg: 2500,
  note: null,
}

describe('buildInvoiceNumber', () => {
  it('format INV-YYYYMMDD-XXXX dari tanggal Jakarta + 4 char id', () => {
    expect(buildInvoiceNumber(sale)).toBe('INV-20260623-ABCD')
  })
})

describe('notify orchestrators', () => {
  beforeEach(() => vi.clearAllMocks())

  it('penjualan baru → kirim dokumen PDF dengan caption berisi nominal', async () => {
    await notifySaleCreated(sale)
    expect(buildSaleInvoicePdf).toHaveBeenCalledTimes(1)
    expect(telegram.sendDocument).toHaveBeenCalledTimes(1)
    const [, filename, caption] = (telegram.sendDocument as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(filename).toBe('INV-20260623-ABCD.pdf')
    expect(caption).toContain('Penjualan baru')
    expect(caption).toContain('Rp250.000')
  })

  it('penjualan dihapus → kirim teks, bukan dokumen', async () => {
    await notifySaleDeleted(sale)
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(telegram.sendDocument).not.toHaveBeenCalled()
    expect((telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('Penjualan dihapus')
  })

  it('pengeluaran → teks dengan label kategori (default & override kustom)', async () => {
    await notifyExpenseCreated({
      kaplingName: 'Kapling 1',
      expenseDate: new Date('2026-06-23T03:00:00Z'),
      category: 'GAJI_KARYAWAN',
      amount: 200000,
    })
    const msg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msg).toContain('Pengeluaran baru')
    expect(msg).toContain('Gaji karyawan')
    expect(msg).toContain('Rp200.000')

    await notifyExpenseCreated({
      kaplingName: 'Kapling 1',
      expenseDate: new Date('2026-06-23T03:00:00Z'),
      category: 'SEWA_TRUK',
      categoryLabel: 'Sewa Truk',
      amount: 500000,
    })
    const customMsg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0]
    expect(customMsg).toContain('Sewa Truk')
  })

  it('perawatan tanpa biaya → teks "tanpa biaya"', async () => {
    await notifyMaintenanceCreated({
      kaplingName: 'Kapling 1',
      activityDate: new Date('2026-06-23T03:00:00Z'),
      type: 'PUPUK',
      cost: null,
    })
    const msg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msg).toContain('Perawatan baru')
    expect(msg).toContain('Pupuk')
    expect(msg).toContain('tanpa biaya')
  })

  it('tidak pernah throw walau transport gagal', async () => {
    ;(telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'))
    await expect(notifySaleDeleted(sale)).resolves.toBeUndefined()
  })

  it('panen baru tanpa foto → kirim teks', async () => {
    await notifyHarvestCreated({
      kaplingName: 'Kapling 1',
      harvestDate: new Date('2026-06-23T03:00:00Z'),
      weightKg: 120,
    })
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(telegram.sendPhoto).not.toHaveBeenCalled()
    const msg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msg).toContain('Panen baru')
    expect(msg).toContain('Kapling 1')
    expect(msg).toContain('120 kg')
  })

  it('panen dihapus → kirim teks (tanpa mencoba baca foto)', async () => {
    await notifyHarvestDeleted({
      kaplingName: 'Kapling 1',
      harvestDate: new Date('2026-06-23T03:00:00Z'),
      weightKg: 120,
    })
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(telegram.sendPhoto).not.toHaveBeenCalled()
    const msg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msg).toContain('Panen dihapus')
  })

  it('foto hilang di disk → fallback ke sendMessage', async () => {
    await notifyHarvestCreated({
      kaplingName: 'Kapling 1',
      harvestDate: new Date('2026-06-23T03:00:00Z'),
      weightKg: 100,
      photoPath: '/uploads/does-not-exist.jpg',
    })
    // sendPhoto was attempted OR skipped, but fallback ensures sendMessage runs.
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('photoPath di luar /uploads/ ditolak (fallback ke teks)', async () => {
    await notifyHarvestCreated({
      kaplingName: 'Kapling 1',
      harvestDate: new Date('2026-06-23T03:00:00Z'),
      weightKg: 100,
      photoPath: '/etc/passwd',
    })
    expect(telegram.sendPhoto).not.toHaveBeenCalled()
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1)
  })
})
