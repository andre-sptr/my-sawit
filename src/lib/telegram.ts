const API_BASE = 'https://api.telegram.org'
const TIMEOUT_MS = 5000
const MAX_ATTEMPTS = 3 // 1 initial + 2 retries
const BACKOFF_MS = [300, 900] // delay sebelum attempt ke-2 dan ke-3
const MAX_RETRY_AFTER_MS = 3000

export type TelegramSendResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'failed' }

function config() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function parseRetryAfterMs(res: Response): Promise<number | null> {
  if (res.status !== 429) {
    await res.body?.cancel().catch(() => {})
    return null
  }
  const header = res.headers.get('retry-after')
  if (header != null) {
    await res.body?.cancel().catch(() => {})
    const sec = Number(header)
    if (Number.isFinite(sec) && sec >= 0) {
      return Math.min(sec * 1000, MAX_RETRY_AFTER_MS)
    }
    return null
  }
  try {
    const json = (await res.json()) as { parameters?: { retry_after?: number } }
    const sec = json?.parameters?.retry_after
    if (typeof sec === 'number' && Number.isFinite(sec) && sec >= 0) {
      return Math.min(sec * 1000, MAX_RETRY_AFTER_MS)
    }
  } catch {
    // Abaikan parse failure pada body non-JSON
  }
  return null
}

async function attempt(token: string, method: string, body: BodyInit, headers?: HeadersInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      body,
      headers,
      signal: controller.signal,
    })
    const retryAfterMs = await parseRetryAfterMs(res)
    return {
      ok: res.ok,
      status: res.status,
      retriable: res.status >= 500 || res.status === 429,
      retryAfterMs,
    }
  } finally {
    clearTimeout(timer)
  }
}

// Retry pada error jaringan atau 5xx/429. Diam pada 4xx lain (config error;
// retry tidak akan membantu). Tidak pernah throw ke caller.
async function post(token: string, method: string, body: BodyInit, headers?: HeadersInit): Promise<boolean> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    let retryAfterMs: number | null = null
    try {
      const res = await attempt(token, method, body, headers)
      if (res.ok) return true
      console.warn(`[telegram] ${method} HTTP ${res.status} (attempt ${i + 1}/${MAX_ATTEMPTS})`)
      if (!res.retriable) return false
      retryAfterMs = res.retryAfterMs
    } catch (error) {
      console.warn(
        `[telegram] ${method} gagal (attempt ${i + 1}/${MAX_ATTEMPTS}):`,
        error instanceof Error ? error.message : error,
      )
    }
    const delay = retryAfterMs ?? BACKOFF_MS[i]
    if (i < MAX_ATTEMPTS - 1 && delay != null && delay > 0) {
      await sleep(delay)
    }
  }
  return false
}

function blobFromBytes(bytes: Uint8Array, type: string) {
  const exactBytes = new Uint8Array(bytes.byteLength)
  exactBytes.set(bytes)
  return new Blob([exactBytes], { type })
}

export async function sendMessageResult(
  text: string,
  chatIdOverride?: string,
): Promise<TelegramSendResult> {
  const cfg = config()
  if (!cfg) return { ok: false, reason: 'unconfigured' }
  const body = JSON.stringify({
    chat_id: chatIdOverride ?? cfg.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
  const ok = await post(cfg.token, 'sendMessage', body, { 'Content-Type': 'application/json' })
  return ok ? { ok: true } : { ok: false, reason: 'failed' }
}

export async function sendMessage(text: string, chatIdOverride?: string): Promise<void> {
  await sendMessageResult(text, chatIdOverride)
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
  form.append('document', blobFromBytes(bytes, 'application/pdf'), filename)
  await post(cfg.token, 'sendDocument', form)
}

export async function sendPhoto(
  bytes: Uint8Array,
  filename: string,
  caption: string,
  mimeType = 'image/jpeg',
): Promise<void> {
  const cfg = config()
  if (!cfg) return
  const form = new FormData()
  form.append('chat_id', cfg.chatId)
  form.append('caption', caption)
  form.append('parse_mode', 'HTML')
  form.append('photo', blobFromBytes(bytes, mimeType), filename)
  await post(cfg.token, 'sendPhoto', form)
}
