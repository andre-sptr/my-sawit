import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/telegram', () => ({
  sendMessage: vi.fn(async () => {}),
}))
vi.mock('@/lib/bot-commands', () => ({
  dispatchCommand: vi.fn(async () => ({ kind: 'reply', text: 'REPLY' })),
}))

import * as telegram from '@/lib/telegram'
import * as bot from '@/lib/bot-commands'
import { POST } from '@/app/api/telegram/webhook/route'

const ENV = process.env

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/telegram/webhook', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('webhook POST', () => {
  beforeEach(() => {
    process.env = { ...ENV }
    vi.clearAllMocks()
  })
  afterEach(() => {
    process.env = ENV
  })

  it('503 saat TELEGRAM_WEBHOOK_SECRET tidak diset', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    const res = await POST(req({ message: { text: '/help', chat: { id: 1 } } }))
    expect(res.status).toBe(503)
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it('401 saat secret header salah', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'SECRET'
    const res = await POST(
      req({ message: { text: '/help', chat: { id: 1 } } }, { 'x-telegram-bot-api-secret-token': 'WRONG' }),
    )
    expect(res.status).toBe(401)
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it('200 + reply saat chat_id ada di allowed list', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'S'
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = '1,2,3'
    const res = await POST(
      req(
        { message: { text: '/help', chat: { id: 2 } } },
        { 'x-telegram-bot-api-secret-token': 'S' },
      ),
    )
    expect(res.status).toBe(200)
    expect(bot.dispatchCommand).toHaveBeenCalledTimes(1)
    expect(telegram.sendMessage).toHaveBeenCalledWith('REPLY', '2')
  })

  it('chat_id tidak diizinkan: 200 tapi tidak reply', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'S'
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = '1'
    const res = await POST(
      req(
        { message: { text: '/help', chat: { id: 999 } } },
        { 'x-telegram-bot-api-secret-token': 'S' },
      ),
    )
    expect(res.status).toBe(200)
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it('fallback TELEGRAM_CHAT_ID saat ALLOWED tidak diset', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'S'
    delete process.env.TELEGRAM_ALLOWED_CHAT_IDS
    process.env.TELEGRAM_CHAT_ID = '42'
    const res = await POST(
      req(
        { message: { text: '/help', chat: { id: 42 } } },
        { 'x-telegram-bot-api-secret-token': 'S' },
      ),
    )
    expect(res.status).toBe(200)
    expect(telegram.sendMessage).toHaveBeenCalledWith('REPLY', '42')
  })

  it('fallback TELEGRAM_CHAT_ID saat ALLOWED kosong', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'S'
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = ''
    process.env.TELEGRAM_CHAT_ID = '42'
    const res = await POST(
      req(
        { message: { text: '/help', chat: { id: 999 } } },
        { 'x-telegram-bot-api-secret-token': 'S' },
      ),
    )
    expect(res.status).toBe(200)
    expect(bot.dispatchCommand).not.toHaveBeenCalled()
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it('dispatch silent: tidak sendMessage', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'S'
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = '1'
    ;(bot.dispatchCommand as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: 'silent',
    })
    const res = await POST(
      req(
        { message: { text: 'halo', chat: { id: 1 } } },
        { 'x-telegram-bot-api-secret-token': 'S' },
      ),
    )
    expect(res.status).toBe(200)
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it('dispatch error tetap ack agar Telegram tidak retry update yang sama', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'S'
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = '1'
    ;(bot.dispatchCommand as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('db down'),
    )
    const res = await POST(
      req(
        { message: { text: '/laporan', chat: { id: 1 } } },
        { 'x-telegram-bot-api-secret-token': 'S' },
      ),
    )
    expect(res.status).toBe(200)
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      'Maaf, laporan belum bisa diproses. Coba lagi nanti.',
      '1',
    )
  })
})
