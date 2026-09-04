import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import GameGrid from '@/components/GameGrid'
import { getCategory, getGamesByCategory } from '@/lib/games'
import { absoluteUrl, categories, site } from '@/lib/site'

/**
 * One dynamic route serves both category pages the spec asked for:
 *   /category/unblocked      and      /category/idle-clicker
 *
 * They are statically generated from the `categories` list in lib/site.js, and
 * `dynamicParams = false` makes any other slug a hard 404 instead of an
 * on-demand render — no thin auto-generated pages for Google to find.
 *
 * Adding a third category is a single entry in lib/site.js plus a matching
 * `category` value on some games.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }))
}

export function generateMetadata({ params }) {
  const category = getCategory(params.slug)
  if (!category) return { title: 'Category not found' }

  const count = getGamesByCategory(category.slug).length
  const title = `${count} Free ${category.name} Games — No Download`

  return {
    title,
    description: category.description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      type: 'website',
      title: `${title} | ${site.name}`,
      description: category.description,
      url: absoluteUrl(`/category/${category.slug}`),
    },
  }
}

export default function CategoryPage({ params }) {
  const category = getCategory(params.slug)
  if (!category) notFound()

  const games = getGamesByCategory(category.slug)
  const others = categories.filter((entry) => entry.slug !== category.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Games`,
    description: category.description,
    url: absoluteUrl(`/category/${category.slug}`),
    isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: games.length,
      itemListElement: games.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: game.title,
        url: absoluteUrl(`/games/${game.slug}`),
      })),
    },
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Categories' },
          { label: `${category.name} Games` },
        ]}
      />

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
        {category.name} games
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500 dark:text-ink-400">
        {category.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="tag bg-brand-600 px-3 py-1.5 text-white">
          {category.name} ({games.length})
        </span>
        {others.map((entry) => (
          <Link
            key={entry.slug}
            href={`/category/${entry.slug}`}
            className="tag bg-ink-100 px-3 py-1.5 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            {entry.name}
          </Link>
        ))}
        <Link
          href="/games"
          className="tag bg-ink-100 px-3 py-1.5 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
        >
          All games
        </Link>
      </div>

      <GameGrid games={games} priorityCount={4} className="mt-6" />

      {/* Category-level copy. Gives the listing page something to rank for beyond
          a wall of thumbnails, which listing pages otherwise struggle with. */}
      <section className="surface mt-12 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">
          What to expect from {category.name.toLowerCase()} games
        </h2>
        <div className="prose-article mt-3 max-w-3xl">
          <p>{category.blurb}</p>
          <p>
            {category.slug === 'idle-clicker'
              ? 'Every game in this collection stores progress locally, so you can close the tab and pick the run back up later. Look for the offline-earnings upgrade early: it decides whether a game suits two check-ins a day or wants a pinned tab.'
              : 'These are short-session games. Most runs last two to five minutes, controls are one or two keys, and nothing here needs more than integrated graphics to hold a steady frame rate.'}
          </p>
          <p>
            Want the reasoning behind how we pick these?{' '}
            <Link
              href="/blog/best-unblocked-idle-games"
              className="font-medium text-brand-600 underline"
            >
              Read the selection guide
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
