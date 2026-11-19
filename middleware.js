import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin/auth'

/**
 * Guards the admin area. Signed-out visitors get a plain 404 for every admin URL except
 * the login screen, so the dashboard does not advertise itself. Every admin response is
 * marked noindex so search engines never list it.
 */
export async function middleware(req) {
  const { pathname } = req.nextUrl
  const isLogin = pathname === '/admin/login' || pathname === '/api/admin/login'
  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)

  let res
  if (isLogin || authed) {
    res = NextResponse.next()
  } else if (pathname.startsWith('/api/')) {
    res = NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else {
    res = NextResponse.rewrite(new URL('/__not-found', req.url), { status: 404 })
  }
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }
