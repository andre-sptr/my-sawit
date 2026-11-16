import { NextResponse, type NextRequest } from 'next/server'
import { deriveSigningSecret, SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth-token'

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD?.trim()
  const { pathname } = request.nextUrl

  if (!password) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  const secret = await deriveSigningSecret(password, process.env.AUTH_SECRET)
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? ''
  const authed = token ? await verifySessionToken(token, secret) : false

  if (pathname === '/login') {
    if (authed) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!authed) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/kapling/:path*', '/login'],
}
