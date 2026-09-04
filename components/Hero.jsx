import Link from 'next/link'
import { getAllGames } from '@/lib/games'
import { categories, site } from '@/lib/site'

export default function Hero() {
  const total = getAllGames().length

  return (
    <section className="relative overflow-hidden border-b border-ink-200 bg-gradient-to-br
      from-brand-700 via-brand-600 to-brand-800 dark:border-ink-800">
      {/* Decorative grid + glow. aria-hidden: purely presentational. */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/30 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative py-14 sm:py-20">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />
            {total} games · no downloads · no installs
          </span>

          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Unblocked idle games that
            <span className="text-accent-400"> never stop earning</span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
            {site.name} is a hand-picked collection of clicker and idle games that run in
            a single browser tab. Open one, start the numbers going up, and come back
            whenever you like.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/category/idle-clicker" className="btn bg-white px-5 py-3 text-base text-brand-700 hover:bg-brand-50">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
              </svg>
              Start playing
            </Link>
            <Link
              href="/games"
              className="btn border border-white/30 bg-white/10 px-5 py-3 text-base text-white hover:bg-white/20"
            >
              Browse all {total} games
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-100">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="underline decoration-brand-300/60 underline-offset-4 hover:text-white"
              >
                {category.name} games
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
