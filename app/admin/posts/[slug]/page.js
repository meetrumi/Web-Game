'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import gamesData from '@/data/games.json'
import { faqToText, slugify, structureToBody } from '@/lib/admin/format'

const empty = {
  title: '', slug: '', description: '', excerpt: '', category: 'Guides', author: 'ClickVault Editorial',
  keywords: '', hero: '', heroAlt: '', relatedGames: [], body: '', faq: '', status: 'draft',
}

function Field({ label, hint, children }) {
  return (
    <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
      {label}
      {hint && <span className="ml-2 font-normal text-ink-400">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function PostEditor({ params }) {
  const isNew = params.slug === 'new'
  const [form, setForm] = useState(empty)
  const [loaded, setLoaded] = useState(isNew)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (isNew) return
    fetch('/api/admin/posts', { cache: 'no-store' }).then((r) => r.json()).then(({ posts, error }) => {
      const p = posts?.find((x) => x.slug === params.slug)
      if (!p) { setMsg({ type: 'error', text: error || 'Post not found.' }); return }
      setForm({
        ...empty, ...p,
        keywords: (p.keywords || []).join(', '),
        heroAlt: p.heroAlt || '',
        body: structureToBody(p),
        faq: faqToText(p.faq),
        status: p.status === 'draft' ? 'draft' : 'published',
      })
      setLoaded(true)
    })
  }, [isNew, params.slug])

  async function upload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg({ type: '', text: 'Uploading image…' })
    const fd = new FormData()
    fd.append('file', file); fd.append('name', form.slug || form.title || file.name)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok) return setMsg({ type: 'error', text: json.error })
    set('hero', json.url)
    setMsg({ type: 'ok', text: 'Image uploaded. It will show on the live site after the next deploy.' })
  }

  async function save(status) {
    setBusy(true); setMsg({ type: '', text: 'Saving…' })
    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status, originalSlug: isNew ? null : params.slug }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setMsg({ type: 'error', text: json.error })
    setMsg({ type: 'ok', text: status === 'published' ? 'Published! Live in about 1–2 minutes.' : 'Draft saved.' })
    if (isNew || json.post.slug !== params.slug) window.history.replaceState(null, '', `/admin/posts/${json.post.slug}`)
  }

  const descLen = form.description.length
  const titleLen = form.title.length

  if (!loaded) return <p className="text-ink-400">{msg.text || 'Loading…'}</p>

  return (
    <div>
      <Link href="/admin" className="text-sm text-brand-600 hover:underline">← Back to dashboard</Link>
      <h1 className="mt-2 text-3xl font-extrabold text-ink-900 dark:text-white">{isNew ? 'New blog post' : 'Edit blog post'}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface space-y-5 p-6">
          <Field label="Title" hint={`${titleLen}/60 — keep the main keyword near the start`}>
            <input className="admin-input" value={form.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} />
          </Field>
          <Field label="URL slug" hint={`/blog/${form.slug || '…'}`}>
            <input className="admin-input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} />
          </Field>
          <Field label="Meta description" hint={`${descLen}/160 — shown in Google results`}>
            <textarea rows={2} className="admin-input" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Excerpt" hint="short teaser on the blog page (optional)">
            <textarea rows={2} className="admin-input" value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
          </Field>
          <Field label="Article body" hint='Use "## " for headings, blank line between paragraphs, "- " for bullets'>
            <textarea rows={22} className="admin-input font-mono text-[13px]" value={form.body} onChange={(e) => set('body', e.target.value)}
              placeholder={'Opening paragraph (intro)…\n\n## First heading\n\nA paragraph.\n\n- bullet one\n- bullet two\n\n## Second heading\n\nMore text.'} />
          </Field>
          <Field label="FAQ" hint="Q: / A: pairs — shown as rich results in Google">
            <textarea rows={6} className="admin-input font-mono text-[13px]" value={form.faq} onChange={(e) => set('faq', e.target.value)}
              placeholder={'Q: Are these games free?\nA: Yes, every game is free to play.'} />
          </Field>
        </div>

        <div className="space-y-5">
          <div className="surface space-y-3 p-5">
            <button disabled={busy} onClick={() => save('published')} className="btn-primary w-full">Publish</button>
            <button disabled={busy} onClick={() => save('draft')} className="btn-secondary w-full">Save as draft</button>
            {msg.text && <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-ink-500'}`}>{msg.text}</p>}
          </div>

          <div className="surface space-y-4 p-5">
            <Field label="Featured image">
              {form.hero && <img src={form.hero} alt="" className="mb-2 aspect-video w-full rounded-lg object-cover" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="text-sm" />
            </Field>
            <Field label="Image alt text" hint="describe the image">
              <input className="admin-input" value={form.heroAlt} onChange={(e) => set('heroAlt', e.target.value)} />
            </Field>
            <Field label="Category">
              <input className="admin-input" value={form.category} onChange={(e) => set('category', e.target.value)} />
            </Field>
            <Field label="Author">
              <input className="admin-input" value={form.author} onChange={(e) => set('author', e.target.value)} />
            </Field>
            <Field label="Focus keywords" hint="comma separated">
              <input className="admin-input" value={form.keywords} onChange={(e) => set('keywords', e.target.value)} />
            </Field>
            <Field label="Related games" hint="linked at the end of the post">
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-ink-200 p-2 dark:border-ink-700">
                {gamesData.map((g) => (
                  <label key={g.slug} className="flex items-center gap-2 text-sm font-normal">
                    <input type="checkbox" checked={form.relatedGames.includes(g.slug)}
                      onChange={(e) => set('relatedGames', e.target.checked ? [...form.relatedGames, g.slug] : form.relatedGames.filter((s) => s !== g.slug))} />
                    {g.title}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="surface p-5 text-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-400">Google preview</div>
            <div className="mt-2 truncate text-[#1a0dab] dark:text-brand-300">{form.title || 'Post title'} | ClickVault</div>
            <div className="truncate text-xs text-green-700">…/blog/{form.slug}</div>
            <div className="mt-1 line-clamp-2 text-ink-500">{form.description || 'Meta description…'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
