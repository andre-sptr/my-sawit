import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
  headers: vi.fn(async () => new Headers()),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { timingSafeEqualStrings } from '@/lib/security'
import { createSessionToken, deriveSigningSecret, verifySessionToken } from '@/lib/auth-token'
import {
  checkLoginRateLimit,
  isAuthEnabled,
  isAuthenticated,
  recordLoginFailure,
  requireAuth,
  requirePageAuth,
  resetLoginRateLimit,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
  verifyAppPassword,
} from '@/lib/auth'

const ORIG_ENV = process.env

describe('timingSafeEqualStrings', () => {
  it('mengembalikan true untuk string identik dan false untuk panjang/isi berbeda', () => {
    expect(timingSafeEqualStrings('rahasia-123', 'rahasia-123')).toBe(true)
    expect(timingSafeEqualStrings('rahasia-123', 'rahasia-124')).toBe(false)
    expect(timingSafeEqualStrings('pendek', 'lebih-panjang-sekali')).toBe(false)
    expect(timingSafeEqualStrings('', '')).toBe(true)
  })
})

describe('auth-token HMAC session', () => {
  it('menerbitkan dan memverifikasi token valid, menolak token kedaluwarsa/terubah', async () => {
    const secret = await deriveSigningSecret('pass123', 'custom-secret')
    const now = 1_700_000_000_000
    const token = await createSessionToken(secret, 60, now)

    expect(await verifySessionToken(token, secret, now + 30_000)).toBe(true)
    expect(await verifySessionToken(token, secret, now + 61_000)).toBe(false)
    expect(await verifySessionToken(`${token}x`, secret, now + 1_000)).toBe(false)
    expect(await verifySessionToken(token, 'other-secret', now + 1_000)).toBe(false)
    expect(await verifySessionToken('malformed', secret, now)).toBe(false)
  })
})

describe('auth helpers & guards', () => {
  beforeEach(() => {
    process.env = { ...ORIG_ENV }
    vi.clearAllMocks()
    resetLoginRateLimit('127.0.0.1')
  })
  afterEach(() => {
    process.env = ORIG_ENV
  })

  it('bypass auth otomatis saat APP_PASSWORD kosong/tidak diset', async () => {
    delete process.env.APP_PASSWORD
    expect(isAuthEnabled()).toBe(false)
    expect(await isAuthenticated()).toBe(true)
    await expect(requireAuth()).resolves.toBeUndefined()
  })

  it('menolak unauthenticated saat APP_PASSWORD aktif', async () => {
    process.env.APP_PASSWORD = 'sawit-aman'
    cookieStore.get.mockReturnValue(undefined)

    expect(isAuthEnabled()).toBe(true)
    expect(verifyAppPassword('sawit-aman')).toBe(true)
    expect(verifyAppPassword('salah')).toBe(false)
    expect(await isAuthenticated()).toBe(false)
    await expect(requireAuth()).rejects.toThrow(/login/i)
    await expect(requirePageAuth()).rejects.toThrow('REDIRECT:/login')
  })

  it('menerima cookie sesi valid saat APP_PASSWORD aktif', async () => {
    process.env.APP_PASSWORD = 'sawit-aman'
    const secret = await deriveSigningSecret('sawit-aman')
    const token = await createSessionToken(secret)
    cookieStore.get.mockImplementation((name: string) =>
      name === SESSION_COOKIE_NAME ? { value: token } : undefined,
    )

    expect(await isAuthenticated()).toBe(true)
    await expect(requireAuth()).resolves.toBeUndefined()
  })

  it('rate limiter memblokir setelah terlalu banyak kegagalan dan bisa di-reset', () => {
    const now = 1_700_000_000_000
    for (let i = 0; i < 10; i++) {
      expect(checkLoginRateLimit('127.0.0.1', now).allowed).toBe(true)
      recordLoginFailure('127.0.0.1', now)
    }
    const blocked = checkLoginRateLimit('127.0.0.1', now + 1000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)

    resetLoginRateLimit('127.0.0.1')
    expect(checkLoginRateLimit('127.0.0.1', now + 1000).allowed).toBe(true)
  })

  it('shouldUseSecureCookie mendeteksi https dari x-forwarded-proto', () => {
    expect(shouldUseSecureCookie(new Headers({ 'x-forwarded-proto': 'https' }))).toBe(true)
    expect(shouldUseSecureCookie(new Headers({ 'x-forwarded-proto': 'http' }))).toBe(false)
    expect(shouldUseSecureCookie(new Headers())).toBe(false)
  })
})
