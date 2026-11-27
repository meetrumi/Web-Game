import { ImageResponse } from 'next/og'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import { site } from '@/lib/site'

// A 1200×630 PNG share card per article. Social networks don't render SVG hero
// images, so without this, shared links showed no preview picture at all.
export const alt = 'Article preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export default async function PostOgImage({ params }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  const title = post?.title || site.name
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '64px 72px', background: 'linear-gradient(135deg,#12052a 0%,#3b1d6e 55%,#ff4fa3 130%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#5b5bf7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900 }}>C</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{site.name}</div>
          <div style={{ marginLeft: 16, padding: '6px 16px', borderRadius: 999, background: 'rgba(255,255,255,.15)', fontSize: 22, fontWeight: 700 }}>{post?.category || 'Blog'}</div>
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 70 ? 56 : 66, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 24, color: '#e2d9ff' }}>{post ? `${post.readingMinutes} min read · ${post.updatedAt || post.publishedAt}` : ''}</div>
      </div>
    ),
    size,
  )
}
