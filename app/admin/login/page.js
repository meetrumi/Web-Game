'use client'
import { useState } from 'react'

export default function AdminLogin() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const f = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: f.get('username'), password: f.get('password') }),
    })
    if (res.ok) { window.location.href = '/admin' ; return }
    setError((await res.json().catch(() => ({}))).error || 'Login failed.')
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold text-ink-900 dark:text-white">Sign in</h1>
      <form onSubmit={submit} className="surface mt-6 space-y-4 p-6">
        <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
          Username
          <input name="username" autoComplete="username" required className="admin-input mt-1" />
        </label>
        <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="admin-input mt-1" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
