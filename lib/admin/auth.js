/**
 * Admin auth — Web Crypto only, so it runs in both middleware (Edge) and route handlers.
 *
 * Nothing secret lives in the repo. Required env vars (set in Vercel → Settings → Environment Variables):
 *   ADMIN_USERNAME        the login name
 *   ADMIN_PASSWORD_HASH   pbkdf2:<iterations>:<saltB64>:<hashB64>  (make one with: node scripts/hash-password.mjs "your password")
 *   ADMIN_SESSION_SECRET  any long random string (signs the session cookie)
 */
export const SESSION_COOKIE = 'cv_admin'
const SESSION_HOURS = 12
const enc = new TextEncoder()

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
const b64url = (buf) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hashPassword(password, saltBytes, iterations = 210000) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
    key,
    256,
  )
  return `pbkdf2:${iterations}:${b64(saltBytes)}:${b64(bits)}`
}

export async function verifyCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME
  const stored = process.env.ADMIN_PASSWORD_HASH
  if (!expectedUser || !stored || typeof username !== 'string' || typeof password !== 'string') return false
  const [scheme, iter, salt] = stored.split(":")
  if (scheme !== 'pbkdf2') return false
  const candidate = await hashPassword(password, unb64(salt), Number(iter))
  // Evaluate both checks every time so timing does not reveal which one failed.
  const userOk = safeEqual(username, expectedUser)
  const passOk = safeEqual(candidate, stored)
  return userOk && passOk
}

async function hmac(data) {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 16) throw new Error('ADMIN_SESSION_SECRET is missing or too short')
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

export async function createSessionToken() {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3 })))
  return `${payload}.${await hmac(payload)}`
}

export async function verifySessionToken(token) {
  try {
    if (!token) return false
    const [payload, sig] = token.split('.')
    if (!payload || !sig || !safeEqual(sig, await hmac(payload))) return false
    const json = JSON.parse(new TextDecoder().decode(unb64(payload.replace(/-/g, '+').replace(/_/g, '/'))))
    return typeof json.exp === 'number' && json.exp > Date.now()
  } catch {
    return false
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: SESSION_HOURS * 3600,
}
