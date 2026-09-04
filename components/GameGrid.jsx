import GameCard from '@/components/GameCard'

/**
 * Responsive game grid. 2 columns on the smallest phones, up to 4 on desktop.
 * `priorityCount` marks the first N images as non-lazy — only use it on the
 * grid that sits above the fold.
 */

export default function GameGrid({ games, priorityCount = 0, className = '' }) {
  if (!games?.length) {
    return (
      <div className="surface p-10 text-center">
        <p className="font-semibold text-ink-700 dark:text-ink-200">No games here yet.</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Try another category, or clear your search.
        </p>
      </div>
    )
  }

  return (
    <ul
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 ${className}`}
    >
      {games.map((game, index) => (
        <li key={game.slug} className="flex">
          <GameCard game={game} priority={index < priorityCount} className="w-full" />
        </li>
      ))}
    </ul>
  )
}
