import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/reports', () => ({
  buildDailyReport: vi.fn(async () => 'DAILY'),
  buildWeeklyReport: vi.fn(async () => 'WEEKLY'),
  buildMonthlyReport: vi.fn(async () => 'MONTHLY'),
  buildKaplingsReport: vi.fn(async () => 'KAPLINGS'),
}))

import { dispatchCommand, __internal } from '@/lib/bot-commands'

function msg(text: string) {
  return { message: { text, chat: { id: 1 } } }
}

describe('parseCommand', () => {
  it('mengambil nama tanpa slash dan tanpa @bot', () => {
    expect(__internal.parseCommand('/laporan')).toEqual({ name: 'laporan', args: [] })
    expect(__internal.parseCommand('/laporan@MyBot minggu')).toEqual({
      name: 'laporan',
      args: ['minggu'],
    })
  })

  it('teks non-command → null', () => {
    expect(__internal.parseCommand('halo')).toBeNull()
    expect(__internal.parseCommand('')).toBeNull()
  })
})

describe('dispatchCommand', () => {
  beforeEach(() => vi.clearAllMocks())

  it('/help → HELP_TEXT', async () => {
    const r = await dispatchCommand(msg('/help'))
    expect(r).toEqual({ kind: 'reply', text: __internal.HELP_TEXT })
  })

  it('/start juga tampilkan HELP_TEXT', async () => {
    const r = await dispatchCommand(msg('/start'))
    expect(r).toEqual({ kind: 'reply', text: __internal.HELP_TEXT })
  })

  it('/laporan default → daily', async () => {
    const r = await dispatchCommand(msg('/laporan'))
    expect(r).toEqual({ kind: 'reply', text: 'DAILY' })
  })

  it('/laporan minggu → weekly', async () => {
    const r = await dispatchCommand(msg('/laporan minggu'))
    expect(r).toEqual({ kind: 'reply', text: 'WEEKLY' })
  })

  it('/laporan bulan → monthly', async () => {
    const r = await dispatchCommand(msg('/laporan bulan'))
    expect(r).toEqual({ kind: 'reply', text: 'MONTHLY' })
  })

  it('/kapling → kaplings report', async () => {
    const r = await dispatchCommand(msg('/kapling'))
    expect(r).toEqual({ kind: 'reply', text: 'KAPLINGS' })
  })

  it('perintah tidak dikenal → pesan bantuan singkat', async () => {
    const r = await dispatchCommand(msg('/tidakada'))
    expect(r).toEqual({ kind: 'reply', text: __internal.UNKNOWN_TEXT })
  })

  it('teks biasa (non-command) → silent', async () => {
    const r = await dispatchCommand(msg('halo bos'))
    expect(r).toEqual({ kind: 'silent' })
  })

  it('update tanpa text → silent', async () => {
    const r = await dispatchCommand({ message: { chat: { id: 1 } } })
    expect(r).toEqual({ kind: 'silent' })
  })
})
