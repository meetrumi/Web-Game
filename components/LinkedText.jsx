import Link from 'next/link'
import { getAllGames } from '@/lib/games'

const games = getAllGames()
const pattern = new RegExp(`\\b(${games.map((g) => g.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g')
const bySlug = Object.fromEntries(games.map((g) => [g.title, g.slug]))

// Markdown-style links written into post copy: [anchor text](/internal or https://external)
const MD_LINK = /\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)\s]+)\)/g

const linkClass = 'font-medium text-brand-600 hover:underline dark:text-brand-300'

/** Game titles in plain text become links to their game page. */
function withGameLinks(text, keyPrefix) {
  return String(text).split(pattern).map((part, i) =>
    bySlug[part] ? (
      <Link key={`${keyPrefix}-${i}`} href={`/games/${bySlug[part]}`} className={linkClass}>
        {part}
      </Link>
    ) : (
      part
    ),
  )
}

/**
 * Renders article text with:
 *  - explicit [anchor](url) links. Internal paths use next/link; external URLs open
 *    in a new tab with rel="noopener noreferrer" (no nofollow, so cited sources are
 *    ordinary editorial links);
 *  - every remaining game title turned into a link to its page, which gives each blog
 *    post contextual internal links without hand-editing the copy.
 */
export default function LinkedText({ text }) {
  const source = String(text)
  const out = []
  let last = 0
  let match
  MD_LINK.lastIndex = 0
  while ((match = MD_LINK.exec(source)) !== null) {
    if (match.index > last) out.push(...withGameLinks(source.slice(last, match.index), `t${last}`))
    const [, label, href] = match
    out.push(
      href.startsWith('/') ? (
        <Link key={`l${match.index}`} href={href} className={linkClass}>
          {label}
        </Link>
      ) : (
        <a key={`l${match.index}`} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {label}
        </a>
      ),
    )
    last = match.index + match[0].length
  }
  if (last < source.length) out.push(...withGameLinks(source.slice(last), `t${last}`))
  return out
}

/** Plain-text version (for JSON-LD, word counts and meta tags). */
export function stripLinks(text) {
  return String(text).replace(MD_LINK, '$1')
}
