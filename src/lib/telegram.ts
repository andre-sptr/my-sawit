const API_BASE = 'https://api.telegram.org'
const TIMEOUT_MS = 5000

function config() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

async function post(token: string, method: string, body: BodyInit, headers?: HeadersInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      body,
      headers,
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[telegram] ${method} HTTP ${res.status}`)
    }
  } catch (error) {
    console.warn(`[telegram] ${method} gagal:`, error instanceof Error ? error.message : error)
  } finally {
    clearTimeout(timer)
  }
}

export async function sendMessage(text: string): Promise<void> {
  const cfg = config()
  if (!cfg) return
  const body = JSON.stringify({
    chat_id: cfg.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
  await post(cfg.token, 'sendMessage', body, { 'Content-Type': 'application/json' })
}

export async function sendDocument(
  bytes: Uint8Array,
  filename: string,
  caption: string,
): Promise<void> {
  const cfg = config()
  if (!cfg) return
  const form = new FormData()
  form.append('chat_id', cfg.chatId)
  form.append('caption', caption)
  form.append('parse_mode', 'HTML')
  form.append('document', new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }), filename)
  await post(cfg.token, 'sendDocument', form)
}
