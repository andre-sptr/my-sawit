import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/reports', () => ({
  buildDailyReport: vi.fn(async () => 'DAILY_REPORT'),
}))
vi.mock('@/lib/telegram', () => ({
  sendMessageResult: vi.fn(async () => ({ ok: true })),
}))

import * as telegram from '@/lib/telegram'
import { GET, POST } from '@/app/api/cron/daily-report/route'

const ORIG_ENV = process.env

describe('cron daily-report route', () => {
  beforeEach(() => {
    process.env = { ...ORIG_ENV }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = ORIG_ENV
  })

  it('401 saat CRON_SECRET tidak diset atau token salah', async () => {
    delete process.env.CRON_SECRET
    const resNoEnv = await GET(new Request('http://localhost/api/cron/daily-report'))
    expect(resNoEnv.status).toBe(401)

    process.env.CRON_SECRET = 'cron-rahasia'
    const resBad = await POST(
      new Request('http://localhost/api/cron/daily-report', {
        method: 'POST',
        headers: { authorization: 'Bearer salah' },
      }),
    )
    expect(resBad.status).toBe(401)
    expect(telegram.sendMessageResult).not.toHaveBeenCalled()
  })

  it('200 saat Bearer header atau query ?token= cocok dan Telegram sukses', async () => {
    process.env.CRON_SECRET = 'cron-rahasia'
    ;(telegram.sendMessageResult as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    const resBearer = await GET(
      new Request('http://localhost/api/cron/daily-report', {
        headers: { authorization: 'Bearer cron-rahasia' },
      }),
    )
    expect(resBearer.status).toBe(200)

    const resQuery = await GET(
      new Request('http://localhost/api/cron/daily-report?token=cron-rahasia'),
    )
    expect(resQuery.status).toBe(200)
    expect(telegram.sendMessageResult).toHaveBeenCalledTimes(2)
  })

  it('503 saat Telegram belum dikonfigurasi dan 502 saat pengiriman gagal', async () => {
    process.env.CRON_SECRET = 'cron-rahasia'

    ;(telegram.sendMessageResult as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: 'unconfigured',
    })
    const resUnconf = await GET(
      new Request('http://localhost/api/cron/daily-report', {
        headers: { authorization: 'Bearer cron-rahasia' },
      }),
    )
    expect(resUnconf.status).toBe(503)

    ;(telegram.sendMessageResult as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: 'failed',
    })
    const resFail = await GET(
      new Request('http://localhost/api/cron/daily-report', {
        headers: { authorization: 'Bearer cron-rahasia' },
      }),
    )
    expect(resFail.status).toBe(502)
  })
})
