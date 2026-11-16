import { NextResponse, type NextRequest } from 'next/server'
import {
  deriveSigningSecret,
  PERMANENT_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth-token'

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  if (forwardedProto) {
    return forwardedProto === 'https'
  }
  return request.nextUrl.protocol === 'https:'
}

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD?.trim()
  const username = process.env.APP_USERNAME?.trim()
  const { pathname } = request.nextUrl

  if (!password) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  const secret = await deriveSigningSecret(password, process.env.AUTH_SECRET, username)
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? ''
  const authed = token ? await verifySessionToken(token, secret) : false

  if (pathname === '/login') {
    if (authed) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/') {
    if (!authed) {
      // Halaman utama menampilkan Landing Page identitas website + form login saat belum masuk.
      return NextResponse.next()
    }
  } else if (!authed) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Perpanjang masa berlaku cookie sesi permanen secara bergulir (rolling 400 hari).
  const response = NextResponse.next()
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PERMANENT_COOKIE_MAX_AGE_SECONDS,
    secure: isHttpsRequest(request),
  })
  return response
}

export const config = {
  matcher: ['/', '/kapling/:path*', '/login'],
}
