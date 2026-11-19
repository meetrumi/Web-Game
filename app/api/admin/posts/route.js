import { NextResponse } from 'next/server'
import { readPosts, writePosts } from '@/lib/admin/github'
import { bodyToStructure, readingMinutes, slugify, textToFaq } from '@/lib/admin/format'

export const dynamic = 'force-dynamic'
// Auth is enforced by middleware.js for everything under /api/admin.

export async function GET() {
  try {
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

    const { sha, posts } = await readPosts()
    const originalSlug = input.originalSlug || null
    if (slug !== originalSlug && posts.some((p) => p.slug === slug)) {
      return NextResponse.json({ error: `A post with the slug "${slug}" already exists.` }, { status: 409 })
    }

    const existing = originalSlug ? posts.find((p) => p.slug === originalSlug) : null
    const { intro, sections } = bodyToStructure(input.body)
    const today = new Date().toISOString().slice(0, 10)
    const status = input.status === 'draft' ? 'draft' : 'published'
    const description = String(input.description || '').trim().slice(0, 160)

    const post = {
      slug,
      title,
      description,
      excerpt: String(input.excerpt || description).trim(),
      category: String(input.category || 'Guides').trim(),
      author: String(input.author || 'ClickVault Editorial').trim(),
      status,
      publishedAt:
        existing?.status === 'draft' && status === 'published'
          ? today
          : existing?.publishedAt || today,
      updatedAt: today,
      hero: String(input.hero || '/thumbs/blog-best-idle.svg'),
      heroAlt: String(input.heroAlt || title),
      keywords: String(input.keywords || '').split(',').map((k) => k.trim()).filter(Boolean),
      relatedGames: Array.isArray(input.relatedGames) ? input.relatedGames : [],
      intro,
      sections,
      faq: textToFaq(input.faq),
    }
    post.readingMinutes = readingMinutes(post)

    const next = existing ? posts.map((p) => (p.slug === originalSlug ? post : p)) : [post, ...posts]
    await writePosts(next, sha, `${existing ? 'Update' : 'Add'} blog post: ${title} [${status}]`)
    return NextResponse.json({ ok: true, post })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const slug = new URL(req.url).searchParams.get('slug')
    const { sha, posts } = await readPosts()
    const target = posts.find((p) => p.slug === slug)
    if (!target) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    await writePosts(posts.filter((p) => p.slug !== slug), sha, `Delete blog post: ${target.title}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
