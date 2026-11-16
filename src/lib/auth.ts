import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { timingSafeEqualStrings } from '@/lib/security'
import {
  createSessionToken,
  DEFAULT_SESSION_TTL_SECONDS,
  deriveSigningSecret,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth-token'

export { SESSION_COOKIE_NAME }

const MAX_FAILED_ATTEMPTS = 10
const RATE_WINDOW_MS = 15 * 60 * 1000

const failedAttempts = new Map<string, { count: number; resetAt: number }>()

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim())
}

export function verifyAppPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim()
  if (!expected) return true
  return timingSafeEqualStrings(candidate, expected)
}

async function getSigningSecret(): Promise<string> {
  const password = process.env.APP_PASSWORD?.trim() ?? ''
  return deriveSigningSecret(password, process.env.AUTH_SECRET)
}

export async function isAuthenticated(): Promise<boolean> {
  if (!isAuthEnabled()) return true
  const store = await cookies()
  const token = store.get(SESSION_COOKIE_NAME)?.value
  if (!token) return false
  const secret = await getSigningSecret()
  return verifySessionToken(token, secret)
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error('Sesi berakhir. Silakan login kembali.')
  }
}

export async function requirePageAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect('/login')
  }
}

export async function issueSessionCookieValue(): Promise<string> {
  const secret = await getSigningSecret()
  return createSessionToken(secret, DEFAULT_SESSION_TTL_SECONDS)
}

export function shouldUseSecureCookie(hdrs: Headers): boolean {
  const forwardedProto = hdrs.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  if (forwardedProto) {
    return forwardedProto === 'https'
  }
  const origin = hdrs.get('origin') ?? hdrs.get('referer') ?? ''
  return origin.startsWith('https://')
}

export function getClientRateLimitKey(hdrs: Headers): string {
  const forwarded = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = hdrs.get('x-real-ip')?.trim()
  return forwarded || realIp || 'global'
}

export function checkLoginRateLimit(key: string, nowMs = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const entry = failedAttempts.get(key)
  if (!entry) return { allowed: true, retryAfterSec: 0 }
  if (nowMs >= entry.resetAt) {
    failedAttempts.delete(key)
    return { allowed: true, retryAfterSec: 0 }
  }
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000)) }
  }
  return { allowed: true, retryAfterSec: 0 }
}

export function recordLoginFailure(key: string, nowMs = Date.now()): void {
  const entry = failedAttempts.get(key)
  if (!entry || nowMs >= entry.resetAt) {
    failedAttempts.set(key, { count: 1, resetAt: nowMs + RATE_WINDOW_MS })
    return
  }
  entry.count += 1
}

export function resetLoginRateLimit(key: string): void {
  failedAttempts.delete(key)
}
