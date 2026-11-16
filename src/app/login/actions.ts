'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  checkLoginRateLimit,
  getClientRateLimitKey,
  isAuthEnabled,
  issueSessionCookieValue,
  recordLoginFailure,
  resetLoginRateLimit,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
  verifyAppPassword,
} from '@/lib/auth'
import { DEFAULT_SESSION_TTL_SECONDS } from '@/lib/auth-token'
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

  const raw = formData.get('password')
  const candidate = typeof raw === 'string' ? raw : ''
  if (!candidate) {
    return { ok: false, message: 'Password wajib diisi.' }
  }

  if (!verifyAppPassword(candidate)) {
    recordLoginFailure(rateKey)
    return { ok: false, message: 'Password salah.' }
  }

  resetLoginRateLimit(rateKey)
  const token = await issueSessionCookieValue()
  const store = await cookies()
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
    secure: shouldUseSecureCookie(hdrs),
  })
  redirect('/')
}

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE_NAME)
  redirect('/login')
}
