import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import GameGrid from '@/components/GameGrid'
import { getAllGames, searchGames } from '@/lib/games'
import { categories, site } from '@/lib/site'

export const metadata = {
  title: 'All Games',
  description: `Browse every unblocked idle, clicker and arcade game on ${site.name}. All free, all browser-based, no downloads.`,
  alternates: { canonical: '/games' },
}

/**
 * Full catalogue, and the target of the navbar search box (/games?q=…).
 * Reading searchParams makes this route dynamic, which is what we want — the
 * result set depends on the query string.
 */
export default function GamesPage({ searchParams }) {
  const query = (searchParams?.q || '').trim()
  const games = query ? searchGames(query) : getAllGames()
  const total = getAllGames().length

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'All Games' }]}
      />

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
        {query ? `Search: “${query}”` : 'All games'}
      </h1>

      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
        {query
          ? `${games.length} of ${total} games match your search.`
          : `Every one of our ${total} games runs in the browser — nothing to download, nothing to install.`}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/games"
          className={`tag px-3 py-1.5 ${
            query
              ? 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'
              : 'bg-brand-600 text-white'
          }`}
        >
          All ({total})
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="tag bg-ink-100 px-3 py-1.5 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            {category.name}
          </Link>
        ))}
      </div>

      {query && games.length === 0 ? (
        <div className="surface mt-6 p-10 text-center">
          <p className="font-semibold text-ink-700 dark:text-ink-200">
            Nothing matched “{query}”.
          </p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Try a genre instead — “idle”, “tycoon”, “runner”, “2-player”.
          </p>
          <Link href="/games" className="btn-primary mt-5">
            Show all games
          </Link>
        </div>
      ) : (
        <GameGrid games={games} priorityCount={4} className="mt-6" />
      )}
    </div>
  )
}
