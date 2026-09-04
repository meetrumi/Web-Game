import { notFound } from 'next/navigation'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import ClaimBonusButton from '@/components/ClaimBonusButton'
import GameFrame from '@/components/GameFrame'
import GameGrid from '@/components/GameGrid'
import SectionHeading from '@/components/SectionHeading'
import AdsterraSocialBar from '@/components/ads/AdsterraSocialBar'
import {
  formatPlays,
  getAllGames,
  getCategory,
  getGameBySlug,
  getRelatedGames,
} from '@/lib/games'
import { absoluteUrl, site } from '@/lib/site'

/** Pre-renders one static page per game at build time. */
export function generateStaticParams() {
  return getAllGames().map((game) => ({ slug: game.slug }))
}

export function generateMetadata({ params }) {
  const game = getGameBySlug(params.slug)
  if (!game) return { title: 'Game not found' }

  const category = getCategory(game.category)
  const title = `${game.title} — Play Free ${category?.name ?? ''} Game`.trim()

  return {
    title,
    description: game.shortDescription,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      type: 'article',
      title,
      description: game.shortDescription,
      url: absoluteUrl(`/games/${game.slug}`),
      images: [{ url: game.thumbnail, width: 1200, height: 900, alt: game.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: game.shortDescription,
      images: [game.thumbnail],
    },
  }
}

export default function GamePage({ params }) {
  const game = getGameBySlug(params.slug)
  if (!game) notFound()

  const category = getCategory(game.category)
  const related = getRelatedGames(game.slug, 8)
  const isIdle = game.category === 'idle-clicker'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.shortDescription,
    url: absoluteUrl(`/games/${game.slug}`),
    image: absoluteUrl(game.thumbnail),
    genre: category?.name,
    keywords: (game.tags || []).join(', '),
    playMode: 'SinglePlayer',
    applicationCategory: 'Game',
    operatingSystem: 'Any (web browser)',
    gamePlatform: 'Web browser',
    datePublished: game.addedAt,
    publisher: { '@type': 'Organization', name: site.name },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
        pb-24 reserves room at the bottom of the page for the Adsterra Social Bar,
        which is a fixed overlay. Without the padding the bar covers the last row of
        related games on mobile.
      */}
      <div className="container-page py-5 pb-24 sm:py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: category?.name ?? 'Games', href: `/category/${game.category}` },
            { label: game.title },
          ]}
        />

        {/* ================================================================
          *  ABOVE THE FOLD — GAME VIEWPORT. NO ADS IN THIS BLOCK.
          *
          *  Nothing sponsored goes between the breadcrumb and the CTA below:
          *  no banner above the frame, no overlay on it, no sticky unit beside
          *  it. See the header comment in components/GameFrame.jsx.
          * ================================================================ */}
        <div className="mt-3">
          <GameFrame game={game} />
        </div>

        {/* Directly under the frame: the smart-link CTA. First-party styling, on
            the accent ramp, `rel="sponsored"` set in the component. */}
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-accent-400/40
          bg-accent-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink-900 dark:text-white">
              Daily bonus available for {game.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
              Grab the reward, then come back and keep your streak going.
            </p>
          </div>
          {/* >>> PLUG IN: destination is NEXT_PUBLIC_SMARTLINK_URL in .env.local <<< */}
          <ClaimBonusButton className="shrink-0" />
        </div>

        {/* Title + short description, below the frame as specified. */}
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <span className={isIdle ? 'tag-idle' : 'tag-unblocked'}>{category?.name}</span>
          {(game.tags || []).map((tag) => (
            <span
              key={tag}
              className="tag bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
          {game.title}
        </h1>

        <p className="mt-1.5 text-xs text-ink-400">
          {formatPlays(game.plays)} plays · added{' '}
          {new Date(game.addedAt).toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          })}
        </p>

        <p className="prose-article mt-4 max-w-3xl">{game.shortDescription}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">
              How to play
            </h2>
            {/* >>> PLUG IN: add a `controls` array per game in data/games.json and
                render it here instead of this generic copy. <<< */}
            <p className="prose-article mt-2 text-[15px]">
              {isIdle
                ? 'Click or tap the main resource to earn your first units, then spend them on the cheapest producer. Once passive income outpaces manual clicking, stop clicking and start planning upgrades.'
                : 'Use the arrow keys or WASD to move and the space bar to act. On mobile, tap and swipe anywhere on the game area.'}
            </p>
          </div>
          <div className="surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">
              Details
            </h2>
            <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-400">Category</dt>
              <dd>
                <Link
                  href={`/category/${game.category}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  {category?.name}
                </Link>
              </dd>
              <dt className="text-ink-400">Platform</dt>
              <dd className="text-ink-700 dark:text-ink-200">Any modern browser</dd>
              <dt className="text-ink-400">Price</dt>
              <dd className="text-ink-700 dark:text-ink-200">Free</dd>
              <dt className="text-ink-400">Install</dt>
              <dd className="text-ink-700 dark:text-ink-200">Not required</dd>
            </dl>
          </div>
        </div>

        {/* ================================================================
          *  FIRST AD-SAFE ZONE ON THIS PAGE
          *
          *  Everything above is either the game or its immediate controls, so
          *  this is the highest point a display unit may appear. Even here,
          *  prefer leaving game pages ad-light and earning from the blog:
          *
          *  Auto ads cannot be excluded per-region in code. To keep units away
          *  from the frame, go to AdSense → Ads → By URL group and exclude
          *  /games/* , then place manual units only below this line.
          * ================================================================ */}

        <section className="mt-12" aria-labelledby="related">
          <SectionHeading
            as="h2"
            title="More games like this"
            blurb={`Other ${category?.name?.toLowerCase()} picks from the vault.`}
            href={`/category/${game.category}`}
          />
          <GameGrid games={related} />
        </section>
      </div>

      {/* ================================================================
        *  ADSTERRA SOCIAL BAR — mounted ONLY on this route.
        *
        *  Not in app/layout.js, on purpose. It unmounts (and cleans up its
        *  injected DOM) as soon as you navigate away from a game page.
        * ================================================================ */}
      <AdsterraSocialBar />
    </>
  )
}
