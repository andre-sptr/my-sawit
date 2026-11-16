export const SESSION_COOKIE_NAME = 'rekapal_session'
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4)
  try {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function deriveSigningSecret(appPassword: string, explicitSecret?: string): Promise<string> {
  const custom = explicitSecret?.trim()
  if (custom) return custom
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`rekapal-session:${appPassword}`))
  return toBase64Url(new Uint8Array(digest))
}

export async function createSessionToken(
  secret: string,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
  nowMs = Date.now(),
): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + ttlSeconds
  const payloadBytes = encoder.encode(JSON.stringify({ exp }))
  const payloadB64 = toBase64Url(payloadBytes)
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
  return `${payloadB64}.${toBase64Url(new Uint8Array(sig))}`
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, sigB64] = parts
  if (!payloadB64 || !sigB64) return false

  const sigBytes = fromBase64Url(sigB64)
  const payloadBytes = fromBase64Url(payloadB64)
  if (!sigBytes || !payloadBytes) return false

  const key = await importHmacKey(secret)
  const validSig = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes as BufferSource,
    encoder.encode(payloadB64),
  )
  if (!validSig) return false

  try {
    const parsed = JSON.parse(decoder.decode(payloadBytes)) as { exp?: unknown }
    if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) return false
    return parsed.exp > Math.floor(nowMs / 1000)
  } catch {
    return false
  }
}
