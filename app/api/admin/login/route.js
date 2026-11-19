import { NextResponse } from 'next/server'
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifyCredentials } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

// Basic brute-force brake: 5 failures per IP per 15 minutes (per server instance).
const failures = new Map()
const WINDOW = 15 * 60e3

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const rec = failures.get(ip)
  if (rec && now - rec.first < WINDOW && rec.count >= 5) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  let body = {}
  try { body = await req.json() } catch {}
  const ok = await verifyCredentials(body.username, body.password)
  if (!ok) {
    const next = rec && now - rec.first < WINDOW ? { ...rec, count: rec.count + 1 } : { first: now, count: 1 }
    failures.set(ip, next)
    await new Promise((r) => setTimeout(r, 600))
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 })
  }
  failures.delete(ip)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions)
  return res
}
