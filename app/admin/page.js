'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    const res = await fetch('/api/admin/posts', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) setError(json.error || 'Could not load posts'); else setPosts(json.posts)
  }
  useEffect(() => { load() }, [])

  async function remove(slug, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone from the dashboard.`)) return
    setBusy(slug); setError(''); setNotice('')
    try {
      const res = await fetch(`/api/admin/posts?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Delete failed (${res.status})`)
      setPosts((list) => list.filter((p) => p.slug !== slug))
      setNotice(`Deleted "${title}". It disappears from the live site after the automatic redeploy (about 1–2 minutes).`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const published = posts?.filter((p) => p.status !== 'draft') || []
  const drafts = posts?.filter((p) => p.status === 'draft') || []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-ink-900 dark:text-white">Admin dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/posts/new" className="btn-primary">+ New blog post</Link>
          <button onClick={logout} className="btn-secondary">Log out</button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[['Published posts', published.length], ['Drafts', drafts.length], ['Total posts', posts?.length ?? 0]].map(([label, n]) => (
          <div key={label} className="surface p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</div>
            <div className="mt-1 text-3xl font-extrabold text-ink-900 dark:text-white">{posts ? n : '…'}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
        Publishing commits to GitHub and Vercel redeploys automatically. New or edited posts go live in about 1–2 minutes.
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠ {error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">✓ {notice}</p>}

      <div className="surface mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-400 dark:bg-ink-800">
            <tr><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
            {!posts && !error && <tr><td className="p-3 text-ink-400" colSpan={4}>Loading…</td></tr>}
            {posts?.map((p) => (
              <tr key={p.slug}>
                <td className="p-3 font-medium text-ink-900 dark:text-white">{p.title}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {p.status === 'draft' ? 'Draft' : 'Published'}
                  </span>
                </td>
                <td className="p-3 text-ink-500">{p.updatedAt || p.publishedAt}</td>
                <td className="space-x-3 whitespace-nowrap p-3 text-right">
                  {p.status !== 'draft' && <a href={`/blog/${p.slug}`} target="_blank" className="text-ink-500 hover:underline">View</a>}
                  <Link href={`/admin/posts/${p.slug}`} className="text-brand-600 hover:underline">Edit</Link>
                  <button disabled={busy === p.slug} onClick={() => remove(p.slug, p.title)} className="text-red-600 hover:underline disabled:opacity-50">
                    {busy === p.slug ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
