import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV = process.env

describe('telegram transport', () => {
  beforeEach(() => {
    process.env = { ...ENV }
    vi.restoreAllMocks()
  })
  afterEach(() => {
    process.env = ENV
  })

  it('no-op (fetch tidak dipanggil) saat env kosong', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('halo')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sendMessage POST ke endpoint benar saat env terisi', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('halo dunia')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/botTOKEN/sendMessage')
    expect(JSON.parse(init.body as string)).toMatchObject({
      chat_id: '-100',
      text: 'halo dunia',
      parse_mode: 'HTML',
    })
  })

  it('menelan error jaringan tanpa throw', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const { sendMessage } = await import('@/lib/telegram')
    await expect(sendMessage('x')).resolves.toBeUndefined()
  })

  it('retry pada 500 lalu berhasil di attempt ke-2', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    let calls = 0
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls++
      if (calls === 1) return new Response('err', { status: 500 })
      return new Response('{}', { status: 200 })
    })
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('x')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('tidak retry pada 400 (config error)', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('bad', { status: 400 }))
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('x')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('retry pada network error hingga MAX_ATTEMPTS lalu menyerah', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('net'))
    const { sendMessage } = await import('@/lib/telegram')
    await expect(sendMessage('x')).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  }, 10000)

  it('sendPhoto POST ke endpoint sendPhoto dengan multipart form', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    const { sendPhoto } = await import('@/lib/telegram')
    await sendPhoto(new Uint8Array([1, 2, 3]), 'foo.jpg', 'caption', 'image/jpeg')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/botTOKEN/sendPhoto')
    expect(init.body).toBeInstanceOf(FormData)
    const form = init.body as FormData
    expect(form.get('chat_id')).toBe('-100')
    expect(form.get('caption')).toBe('caption')
    expect(form.get('photo')).toBeInstanceOf(Blob)
  })

  it('sendPhoto hanya mengirim byte dari Uint8Array view', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    const source = new Uint8Array(new ArrayBuffer(10), 2, 3)
    source.set([1, 2, 3])
    const { sendPhoto } = await import('@/lib/telegram')
    await sendPhoto(source, 'foo.jpg', 'caption', 'image/jpeg')
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const form = init.body as FormData
    expect((form.get('photo') as Blob).size).toBe(3)
  })

  it('sendDocument hanya mengirim byte dari Uint8Array view', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    const source = new Uint8Array(new ArrayBuffer(10), 2, 3)
    source.set([0x25, 0x50, 0x44])
    const { sendDocument } = await import('@/lib/telegram')
    await sendDocument(source, 'invoice.pdf', 'caption')
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const form = init.body as FormData
    expect((form.get('document') as Blob).size).toBe(3)
  })

  it('sendMessageResult mengembalikan status unconfigured, failed, atau ok', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    const mod = await import('@/lib/telegram')
    expect(await mod.sendMessageResult('halo')).toEqual({ ok: false, reason: 'unconfigured' })

    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('bad', { status: 400 }))
    expect(await mod.sendMessageResult('halo')).toEqual({ ok: false, reason: 'failed' })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }))
    expect(await mod.sendMessageResult('halo')).toEqual({ ok: true })
  })

  it('retry pada 429 dengan Retry-After header', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    let calls = 0
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls++
      if (calls === 1) {
        return new Response('{}', { status: 429, headers: { 'retry-after': '0' } })
      }
      return new Response('{}', { status: 200 })
    })
    const { sendMessageResult } = await import('@/lib/telegram')
    expect(await sendMessageResult('halo')).toEqual({ ok: true })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
