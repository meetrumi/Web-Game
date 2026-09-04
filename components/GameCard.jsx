import Image from 'next/image'
import Link from 'next/link'
import { formatPlays, getCategoryName } from '@/lib/games'

/**
 * Game card: thumbnail, title, category tag, play icon on hover.
 *
 * Images are lazy-loaded by default (next/image behaviour). Pass `priority` on the
 * handful of cards that are above the fold on the homepage so the LCP image is not
 * lazy — anything below the fold should leave it off.
 */

export default function GameCard({ game, priority = false, className = '' }) {
  const isIdle = game.category === 'idle-clicker'

  return (
    <Link
      href={`/games/${game.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200
        bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300
        hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-700
        ${className}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
        <Image
          src={game.thumbnail}
          alt={`${game.title} thumbnail`}
          fill
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
        />

        {/* Hover scrim + play button. Fades in on hover and on keyboard focus. */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-ink-950/45 opacity-0
            transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <span
            className="grid h-14 w-14 scale-90 place-items-center rounded-full bg-white/95 text-brand-700
              shadow-lg transition-transform duration-200 group-hover:scale-100"
          >
            <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
          </span>
        </div>

        <span
          className={`absolute left-2.5 top-2.5 ${isIdle ? 'tag-idle' : 'tag-unblocked'} backdrop-blur-sm`}
        >
          {getCategoryName(game.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-1 font-bold text-ink-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
          {game.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-500 dark:text-ink-400">
          {game.shortDescription}
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] font-medium text-ink-400">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          {formatPlays(game.plays)} plays
        </div>
      </div>
    </Link>
  )
}
