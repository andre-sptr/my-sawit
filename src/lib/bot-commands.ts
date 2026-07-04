import {
  buildDailyReport,
  buildKaplingsReport,
  buildMonthlyReport,
  buildWeeklyReport,
} from '@/lib/reports'

// Telegram Update payload — kita hanya butuh sebagian kecil field.
export type TelegramUpdate = {
  message?: {
    text?: string
    chat?: { id?: number | string; type?: string }
    from?: { id?: number | string; username?: string }
  }
}

const HELP_TEXT = [
  '\u{1F916} <b>Perintah tersedia</b>',
  '',
  '/laporan — ringkasan hari ini',
  '/laporan minggu — ringkasan minggu berjalan',
  '/laporan bulan — ringkasan bulan berjalan',
  '/kapling — laporan per kapling (bulan ini)',
  '/help — tampilkan bantuan ini',
].join('\n')

const UNKNOWN_TEXT = 'Perintah tidak dikenali. Ketik /help untuk daftar perintah.'

export type CommandResult =
  | { kind: 'reply'; text: string }
  | { kind: 'silent' } // update yg bukan command / tidak perlu direspons

// Extract "/laporan" atau "/laporan@MyBot" → "laporan"
function parseCommand(text: string): { name: string; args: string[] } | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return null
  const parts = trimmed.slice(1).split(/\s+/)
  const head = parts[0] ?? ''
  const name = head.split('@')[0]?.toLowerCase() ?? ''
  if (!name) return null
  return { name, args: parts.slice(1) }
}

export async function dispatchCommand(update: TelegramUpdate): Promise<CommandResult> {
  const text = update.message?.text
  if (!text) return { kind: 'silent' }
  const parsed = parseCommand(text)
  if (!parsed) return { kind: 'silent' }

  switch (parsed.name) {
    case 'start':
    case 'help':
      return { kind: 'reply', text: HELP_TEXT }
    case 'laporan': {
      const sub = (parsed.args[0] ?? '').toLowerCase()
      if (sub === 'minggu' || sub === 'week') {
        return { kind: 'reply', text: await buildWeeklyReport() }
      }
      if (sub === 'bulan' || sub === 'month') {
        return { kind: 'reply', text: await buildMonthlyReport() }
      }
      return { kind: 'reply', text: await buildDailyReport() }
    }
    case 'kapling':
      return { kind: 'reply', text: await buildKaplingsReport() }
    default:
      return { kind: 'reply', text: UNKNOWN_TEXT }
  }
}

// Test seams
export const __internal = { parseCommand, HELP_TEXT, UNKNOWN_TEXT }
