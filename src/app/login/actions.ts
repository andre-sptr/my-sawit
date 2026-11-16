'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  checkLoginRateLimit,
  getClientRateLimitKey,
  getConfiguredUsername,
  isAuthEnabled,
  issueSessionCookieValue,
  PERMANENT_COOKIE_MAX_AGE_SECONDS,
  recordLoginFailure,
  resetLoginRateLimit,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
  verifyAppCredentials,
} from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!isAuthEnabled()) {
    redirect('/')
  }

  const hdrs = await headers()
  const rateKey = getClientRateLimitKey(hdrs)
  const limit = checkLoginRateLimit(rateKey)
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSec / 60))
    return {
      ok: false,
      message: `Terlalu banyak percobaan login. Coba lagi dalam ${minutes} menit.`,
    }
  }

  const rawUsername = formData.get('username')
  const username = typeof rawUsername === 'string' ? rawUsername.trim() : ''
  const rawPassword = formData.get('password')
  const password = typeof rawPassword === 'string' ? rawPassword : ''

  if (getConfiguredUsername() && !username) {
    return { ok: false, message: 'Username wajib diisi.' }
  }
  if (!password) {
    return { ok: false, message: 'Password wajib diisi.' }
  }

  if (!verifyAppCredentials(username, password)) {
    recordLoginFailure(rateKey)
    return { ok: false, message: 'Username atau password salah.' }
  }

  resetLoginRateLimit(rateKey)
  const token = await issueSessionCookieValue()
  const store = await cookies()
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PERMANENT_COOKIE_MAX_AGE_SECONDS,
    secure: shouldUseSecureCookie(hdrs),
  })
  redirect('/')
}

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE_NAME)
  redirect('/')
}
