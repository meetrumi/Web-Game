import postsData from '@/data/posts.json'

/**
 * Data access layer for blog posts. Same idea as lib/games.js — swap the bodies
 * for a CMS fetch later and every caller keeps working.
 */

export const posts = postsData

export function getAllPosts() {
  return [...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

export function getPostBySlug(slug) {
  return posts.find((post) => post.slug === slug) || null
}

export function getRelatedPosts(slug, limit = 2) {
  return getAllPosts()
    .filter((post) => post.slug !== slug)
    .slice(0, limit)
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Decides which article sections get an in-article ad slot after them.
 *
 * AdSense policy expects ad density to stay below the content itself, so this
 * places one unit after every Nth H2 section and never after the last one
 * (an ad immediately above the FAQ block reads as the end of the article).
 */
export function shouldPlaceInArticleAd(index, total, every = 2) {
  const isLast = index === total - 1
  return !isLast && (index + 1) % every === 0
}
