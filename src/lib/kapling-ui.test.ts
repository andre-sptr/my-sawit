import { describe, expect, it } from 'vitest'
import {
  computeSaleTotalPreview,
  extractMonthOptions,
  filterActivityRecords,
  resolveActivityTab,
} from '@/lib/kapling-ui'

describe('resolveActivityTab', () => {
  it('mengembalikan tab valid apa adanya setelah trim dan lowercase', () => {
    expect(resolveActivityTab('panen')).toBe('panen')
    expect(resolveActivityTab(' Penjualan ')).toBe('penjualan')
    expect(resolveActivityTab('pengaturan')).toBe('pengaturan')
  })

  it('mengambil elemen pertama jika berupa array searchParams', () => {
    expect(resolveActivityTab(['perawatan', 'panen'])).toBe('perawatan')
  })

  it('fallback ke panen jika kosong atau tidak valid', () => {
    expect(resolveActivityTab(undefined)).toBe('panen')
    expect(resolveActivityTab('')).toBe('panen')
    expect(resolveActivityTab('tidak-ada')).toBe('panen')
    expect(resolveActivityTab([])).toBe('panen')
  })
})

describe('computeSaleTotalPreview', () => {
  it('menghitung total penjualan yang valid dan membulatkan rupiah', () => {
    expect(computeSaleTotalPreview('1200', '2500')).toBe(3_000_000)
    expect(computeSaleTotalPreview(' 125.5 ', ' 2000 ')).toBe(251_000)
  })

  it('mengembalikan null untuk input kosong, nol, negatif, atau bukan angka', () => {
    expect(computeSaleTotalPreview('', '2500')).toBeNull()
    expect(computeSaleTotalPreview('100', '')).toBeNull()
    expect(computeSaleTotalPreview('0', '2500')).toBeNull()
    expect(computeSaleTotalPreview('100', '-500')).toBeNull()
    expect(computeSaleTotalPreview('abc', '2500')).toBeNull()
    expect(computeSaleTotalPreview('Infinity', '2500')).toBeNull()
  })
})

describe('filterActivityRecords', () => {
  const sample = [
    { id: '1', date: new Date('2026-04-30T18:00:00.000Z'), note: 'Panen blok utara' }, // 1 Mei 01:00 WIB -> 2026-05
    { id: '2', date: new Date('2026-05-15T04:00:00.000Z'), note: 'Pupuk NPK susulan' },
    { id: '3', date: new Date('2026-04-20T04:00:00.000Z'), note: 'Panen blok selatan' },
  ]

  it('mengembalikan seluruh data saat filter bulan dan kata kunci kosong', () => {
    const res = filterActivityRecords(sample, {
      monthKey: 'all',
      query: '   ',
      getDate: (item) => item.date,
      getSearchText: (item) => item.note,
    })
    expect(res.map((r) => r.id)).toEqual(['1', '2', '3'])
  })

  it('memfilter berdasarkan bulan WIB termasuk batas pergantian bulan UTC', () => {
    const mayRecords = filterActivityRecords(sample, {
      monthKey: '2026-05',
      query: '',
      getDate: (item) => item.date,
      getSearchText: (item) => item.note,
    })
    expect(mayRecords.map((r) => r.id)).toEqual(['1', '2'])
  })

  it('menggabungkan filter bulan dan pencarian teks secara case-insensitive', () => {
    const res = filterActivityRecords(sample, {
      monthKey: '2026-05',
      query: '  UTARA ',
      getDate: (item) => item.date,
      getSearchText: (item) => item.note,
    })
    expect(res.map((r) => r.id)).toEqual(['1'])
  })
})

describe('extractMonthOptions', () => {
  it('mengembalikan daftar bulan unik berurutan dari terbaru', () => {
    const options = extractMonthOptions(
      [
        { d: new Date('2026-03-10T05:00:00Z') },
        { d: new Date('2026-05-12T05:00:00Z') },
        { d: new Date('2026-05-01T05:00:00Z') },
      ],
      (item) => item.d
    )

    expect(options).toEqual([
      { key: '2026-05', label: 'Mei 2026' },
      { key: '2026-03', label: 'Maret 2026' },
    ])
  })

  it('mengembalikan array kosong jika data kosong', () => {
    expect(extractMonthOptions([], () => new Date())).toEqual([])
  })
})
