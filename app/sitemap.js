import { getAllGames } from '@/lib/games'
import { getAllPosts } from '@/lib/posts'
import { absoluteUrl, categories, legalNav } from '@/lib/site'

/**
 * Generates /sitemap.xml at build time from the same data the pages use, so it can
 * never drift out of sync with the routes that actually exist.
 */
export default function sitemap() {
  const now = new Date()

  const staticRoutes = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/games'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.7 },
  ].map((entry) => ({ ...entry, lastModified: now }))

  const categoryRoutes = categories.map((category) => ({
    url: absoluteUrl(`/category/${category.slug}`),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  const gameRoutes = getAllGames().map((game) => ({
    url: absoluteUrl(`/games/${game.slug}`),
    lastModified: new Date(game.addedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const postRoutes = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const legalRoutes = legalNav.map((item) => ({
    url: absoluteUrl(item.href),
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.3,
  }))

  return [...staticRoutes, ...categoryRoutes, ...gameRoutes, ...postRoutes, ...legalRoutes]
}
