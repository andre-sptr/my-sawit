import { NextResponse } from 'next/server'
import { buildDailyReport } from '@/lib/reports'
import { timingSafeEqualStrings } from '@/lib/security'
import { sendMessageResult } from '@/lib/telegram'

// Endpoint dipanggil oleh scheduler (cron lokal / eksternal).
// Perlindungan: disarankan header `Authorization: Bearer <CRON_SECRET>`,
// dengan fallback query `?token=<CRON_SECRET>` untuk scheduler yang tidak mendukung header.

export const runtime = 'nodejs'

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = req.headers.get('authorization')
  if (auth && auth.startsWith('Bearer ')) {
    const provided = auth.slice('Bearer '.length)
    if (timingSafeEqualStrings(provided, secret)) return true
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    return token !== null && timingSafeEqualStrings(token, secret)
  } catch {
    return false
  }
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const text = await buildDailyReport()
  const result = await sendMessageResult(text)
  if (!result.ok) {
    const status = result.reason === 'unconfigured' ? 503 : 502
    return NextResponse.json(
      { ok: false, error: result.reason === 'unconfigured' ? 'telegram not configured' : 'telegram delivery failed' },
      { status },
    )
  }
  return NextResponse.json({ ok: true })
}

export const GET = handle
export const POST = handle
