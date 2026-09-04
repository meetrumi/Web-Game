import Link from 'next/link'
import Hero from '@/components/Hero'
import GameGrid from '@/components/GameGrid'
import SectionHeading from '@/components/SectionHeading'
import {
  countByCategory,
  getFeaturedGames,
  getGamesByCategory,
  getNewestGames,
  getPopularGames,
} from '@/lib/games'
import { getAllPosts, formatDate } from '@/lib/posts'
import { absoluteUrl, categories, site } from '@/lib/site'

export const metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: '/' },
}

export default function HomePage() {
  const featured = getFeaturedGames(4)
  const popular = getPopularGames(8)
  const newest = getNewestGames(4)
  const posts = getAllPosts().slice(0, 3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/games')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero />

      <div className="container-page py-10 sm:py-12">
        {/* priorityCount={4}: these four thumbnails are above the fold, so they
            should not be lazy-loaded. Everything below stays lazy. */}
        <section aria-labelledby="featured">
          <SectionHeading
            as="h2"
            title="Featured this week"
            blurb="Editor picks — the games people keep coming back to."
            href="/games"
          />
          <GameGrid games={featured} priorityCount={4} />
        </section>

        <section className="mt-14" aria-labelledby="popular">
          <SectionHeading
            as="h2"
            title="Most played"
            blurb="Ranked by total plays across the site."
            href="/games"
          />
          <GameGrid games={popular} />
        </section>

        {/* Category strips give each /category page an internal link from the
            homepage, which is the cheapest indexing win available. */}
        {categories.map((category) => (
          <section key={category.slug} className="mt-14" aria-labelledby={category.slug}>
            <SectionHeading
              as="h2"
              title={`${category.name} games`}
              blurb={category.blurb}
              href={`/category/${category.slug}`}
              linkLabel={`All ${countByCategory(category.slug)} games`}
            />
            <GameGrid games={getGamesByCategory(category.slug).slice(0, 4)} />
          </section>
        ))}

        <section className="mt-14" aria-labelledby="newest">
          <SectionHeading as="h2" title="Just added" href="/games" />
          <GameGrid games={newest} />
        </section>

        {/* Blog teasers — same reasoning: internal links to the article pages. */}
        <section className="mt-14" aria-labelledby="reading">
          <SectionHeading
            as="h2"
            title="From the blog"
            blurb="Guides and explainers about the genre."
            href="/blog"
          />
          <ul className="grid gap-4 sm:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="surface group flex h-full flex-col p-5 transition-colors hover:border-brand-300 dark:hover:border-brand-700"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                    {post.category}
                  </span>
                  <h3 className="mt-2 font-bold leading-snug text-ink-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-500 dark:text-ink-400">
                    {post.excerpt}
                  </p>
                  <span className="mt-auto pt-4 text-xs text-ink-400">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Below-the-fold SEO copy. Real text, not keyword filler — thin content is
            the single most common reason an AdSense application is rejected. */}
        <section className="surface mt-14 p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            About {site.name}
          </h2>
          <div className="prose-article mt-3 max-w-3xl">
            <p>
              {site.name} collects browser-native idle, clicker and arcade games that run
              without a download, an installer or a plugin. Every title is HTML5, loads in
              a single tab, and saves your progress to the device you played it on.
            </p>
            <p>
              The two collections split along how you play. {' '}
              <Link href="/category/idle-clicker" className="font-medium text-brand-600 underline">
                Idle and clicker games
              </Link>{' '}
              reward patience: start a production loop, buy the automation, and let the
              multipliers compound between sessions.{' '}
              <Link href="/category/unblocked" className="font-medium text-brand-600 underline">
                Unblocked arcade games
              </Link>{' '}
              are the opposite — short reflex-driven runs you can finish in the time it
              takes a kettle to boil.
            </p>
            <p>
              A note on the word &ldquo;unblocked&rdquo;: it describes a game delivered as
              plain HTML5 from a domain a given network has not filtered. No site can
              promise that on every network, and we do not publish proxies or
              filter-bypass instructions. If games are blocked where you are, that is your
              network administrator&rsquo;s call to make.{' '}
              <Link href="/blog/what-unblocked-really-means" className="font-medium text-brand-600 underline">
                The long version is here
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
