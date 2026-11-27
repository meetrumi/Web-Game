import { getAllPosts } from '@/lib/posts'
import { stripLinks } from '@/components/LinkedText'
import { absoluteUrl, site } from '@/lib/site'

// RSS 2.0 feed of published articles — lets aggregators and readers pick up new posts.
export const dynamic = 'force-static'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function GET() {
  const posts = getAllPosts()
  const items = posts.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${absoluteUrl(`/blog/${p.slug}`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/blog/${p.slug}`)}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(stripLinks(p.description))}</description>
    </item>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} Blog</title>
    <link>${absoluteUrl('/blog')}</link>
    <description>${esc(`Gaming news, guides and explainers from ${site.name}.`)}</description>
    <language>en</language>
    <atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date(posts[0]?.updatedAt || Date.now()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
