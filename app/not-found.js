import Link from 'next/link'
import GameGrid from '@/components/GameGrid'
import { getPopularGames } from '@/lib/games'

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="container-page py-16 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
        That page has despawned
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-500 dark:text-ink-400">
        The link is broken or the game has moved. Here are the most played games on the
        site instead.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to homepage
        </Link>
        <Link href="/games" className="btn-secondary">
          Browse all games
        </Link>
      </div>

      <div className="mt-14 text-left">
        <GameGrid games={getPopularGames(4)} />
      </div>
    </div>
  )
}
