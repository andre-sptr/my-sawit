import { NextResponse } from 'next/server'
import { dispatchCommand, type TelegramUpdate } from '@/lib/bot-commands'
import { timingSafeEqualStrings } from '@/lib/security'
import { sendMessage } from '@/lib/telegram'

// Route handler untuk update dari Telegram (setWebhook).
// Keamanan:
//   1. Header `X-Telegram-Bot-Api-Secret-Token` harus cocok dengan
//      TELEGRAM_WEBHOOK_SECRET (dikonfigurasi saat setWebhook).
//   2. chat.id pengirim harus ada di TELEGRAM_ALLOWED_CHAT_IDS
//      (comma-separated). Kalau tidak diset, fallback ke TELEGRAM_CHAT_ID.

export const runtime = 'nodejs'
const COMMAND_ERROR_TEXT = 'Maaf, laporan belum bisa diproses. Coba lagi nanti.'

function allowedChatIds(): Set<string> {
  const explicit = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim()
  const raw = explicit || process.env.TELEGRAM_CHAT_ID || ''
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) {
    console.warn('[webhook] TELEGRAM_WEBHOOK_SECRET tidak diset — tolak semua')
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 })
  }
  const provided = req.headers.get('x-telegram-bot-api-secret-token')
  if (provided == null || !timingSafeEqualStrings(provided, expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const chatId = update.message?.chat?.id
  if (chatId == null) {
    // Update yg tidak relevan (mis. edited_message tanpa chat). Ack saja.
    return NextResponse.json({ ok: true })
  }

  const allowed = allowedChatIds()
  if (allowed.size === 0 || !allowed.has(String(chatId))) {
    console.warn(`[webhook] chat_id ${chatId} tidak diizinkan`)
    return NextResponse.json({ ok: true })
  }

  try {
    const result = await dispatchCommand(update)
    if (result.kind === 'reply') {
      await sendMessage(result.text, String(chatId))
    }
  } catch (error) {
    console.warn('[webhook] dispatch gagal:', error instanceof Error ? error.message : error)
    await sendMessage(COMMAND_ERROR_TEXT, String(chatId))
  }
  return NextResponse.json({ ok: true })
}
