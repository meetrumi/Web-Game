import gamesData from '@/data/games.json'
import { categories } from '@/lib/site'

/**
 * Data access layer for games.
 *
 * Right now this reads a static JSON file, which Next.js inlines at build time —
 * every page below is statically generated and costs nothing to serve.
 *
 * >>> WHEN YOU MOVE TO A CMS / DATABASE: keep these function signatures and swap
 * the bodies for async fetches. Every caller already handles the shape.
 */

export const games = gamesData

export function getAllGames() {
  return games
}

export function getGameBySlug(slug) {
  return games.find((game) => game.slug === slug) || null
}

export function getGamesByCategory(categorySlug) {
  return games.filter((game) => game.category === categorySlug)
}

export function getFeaturedGames(limit = 4) {
  const featured = games.filter((game) => game.featured)
  const rest = games.filter((game) => !game.featured)
  return [...featured, ...rest].slice(0, limit)
}

export function getPopularGames(limit = 8) {
  return [...games].sort((a, b) => b.plays - a.plays).slice(0, limit)
}

export function getNewestGames(limit = 8) {
  return [...games]
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, limit)
}

/** Same-category games first, then anything else, excluding the current game. */
export function getRelatedGames(slug, limit = 6) {
  const current = getGameBySlug(slug)
  if (!current) return games.slice(0, limit)

  const sameCategory = games.filter(
    (game) => game.slug !== slug && game.category === current.category
  )
  const others = games.filter(
    (game) => game.slug !== slug && game.category !== current.category
  )
  return [...sameCategory, ...others].slice(0, limit)
}

export function getGamesBySlugs(slugs = []) {
  return slugs.map(getGameBySlug).filter(Boolean)
}

/** Naive substring search across title, tags and description. Good enough for 15 games. */
export function searchGames(query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return games

  return games.filter((game) => {
    const haystack = [game.title, game.shortDescription, game.category, ...(game.tags || [])]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function getCategory(slug) {
  return categories.find((category) => category.slug === slug) || null
}

export function getCategoryName(slug) {
  return getCategory(slug)?.name || slug
}

export function countByCategory(slug) {
  return getGamesByCategory(slug).length
}

/** 184320 -> "184.3K" for the play-count badge. */
export function formatPlays(plays) {
  if (plays >= 1_000_000) return `${(plays / 1_000_000).toFixed(1)}M`
  if (plays >= 1_000) return `${(plays / 1_000).toFixed(1)}K`
  return String(plays)
}
