import Link from 'next/link'
import { getAllGames } from '@/lib/games'

const games = getAllGames()
const pattern = new RegExp(`\\b(${games.map((g) => g.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g')
const bySlug = Object.fromEntries(games.map((g) => [g.title, g.slug]))

/**
 * Renders article text with every game title turned into a link to its page.
 * Gives each blog post contextual internal links without hand-editing the copy.
 */
export default function LinkedText({ text }) {
  const parts = String(text).split(pattern)
  return parts.map((part, i) =>
    bySlug[part] ? (
      <Link key={i} href={`/games/${bySlug[part]}`} className="font-medium text-brand-600 hover:underline dark:text-brand-300">
        {part}
      </Link>
    ) : (
      part
    ),
  )
}
