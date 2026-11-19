import { NextResponse } from 'next/server'
import { health, mutatePosts, readPosts } from '@/lib/admin/github'
import { bodyToStructure, readingMinutes, slugify, textToFaq } from '@/lib/admin/format'

export const dynamic = 'force-dynamic'
// Auth is enforced by middleware.js for everything under /api/admin.

export async function GET() {
  try {
    const problems = await health()
    if (problems.length) return NextResponse.json({ error: problems.join(' '), posts: [] }, { status: 500 })
    const { posts } = await readPosts()
    return NextResponse.json({ posts })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const input = await req.json()
    const title = String(input.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    const slug = slugify(input.slug || title)
    if (!slug) return NextResponse.json({ error: 'Slug is invalid.' }, { status: 400 })

    const originalSlug = input.originalSlug || null
    const { intro, sections } = bodyToStructure(input.body)
    const today = new Date().toISOString().slice(0, 10)
    const status = input.status === 'draft' ? 'draft' : 'published'
    const description = String(input.description || '').trim().slice(0, 160)

    const post = await mutatePosts((posts) => {
      if (slug !== originalSlug && posts.some((p) => p.slug === slug)) {
        throw Object.assign(new Error(`A post with the slug "${slug}" already exists.`), { status: 409 })
      }
      const existing = originalSlug ? posts.find((p) => p.slug === originalSlug) : null
      const p = {
        slug,
        title,
        description,
        excerpt: String(input.excerpt || description).trim(),
        category: String(input.category || 'Guides').trim(),
        author: String(input.author || 'ClickVault Editorial').trim(),
        status,
        publishedAt: existing?.status === 'draft' && status === 'published' ? today : existing?.publishedAt || today,
        updatedAt: today,
        hero: String(input.hero || existing?.hero || '/thumbs/blog-best-idle.svg'),
        heroAlt: String(input.heroAlt || title),
        keywords: String(input.keywords || '').split(',').map((k) => k.trim()).filter(Boolean),
        relatedGames: Array.isArray(input.relatedGames) ? input.relatedGames : [],
        intro,
        sections,
        faq: textToFaq(input.faq),
      }
      p.readingMinutes = readingMinutes(p)
      const next = existing ? posts.map((x) => (x.slug === originalSlug ? p : x)) : [p, ...posts]
      return { posts: next, message: `${existing ? 'Update' : 'Add'} blog post: ${title} [${status}]`, result: p }
    })
    return NextResponse.json({ ok: true, post })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}

export async function DELETE(req) {
  try {
    const slug = new URL(req.url).searchParams.get('slug')
    await mutatePosts((posts) => {
      const target = posts.find((p) => p.slug === slug)
      if (!target) throw Object.assign(new Error('Post not found — it may already be deleted.'), { status: 404 })
      return { posts: posts.filter((p) => p.slug !== slug), message: `Delete blog post: ${target.title}` }
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
