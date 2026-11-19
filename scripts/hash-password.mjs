// Usage: node scripts/hash-password.mjs "my new password"
// Paste the output into the ADMIN_PASSWORD_HASH env var in Vercel.
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
const { hashPassword } = await import('../lib/admin/auth.js')
const pw = process.argv[2]
if (!pw || pw.length < 10) { console.error('Give a password of at least 10 characters.'); process.exit(1) }
console.log(await hashPassword(pw, crypto.getRandomValues(new Uint8Array(16))))
