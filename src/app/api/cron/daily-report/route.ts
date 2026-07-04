import { NextResponse } from 'next/server'
import { buildDailyReport } from '@/lib/reports'
import { sendMessage } from '@/lib/telegram'

// Endpoint dipanggil oleh scheduler (Vercel Cron / cron eksternal / GitHub Action).
// Perlindungan: header `Authorization: Bearer <CRON_SECRET>`
// atau query `?token=<CRON_SECRET>` untuk service yg tidak dukung header.

export const runtime = 'nodejs'

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('token') === secret
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const text = await buildDailyReport()
  await sendMessage(text)
  return NextResponse.json({ ok: true })
}

export const GET = handle
export const POST = handle
