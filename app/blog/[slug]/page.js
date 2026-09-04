import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import GameCard from '@/components/GameCard'
import AdSlot from '@/components/ads/AdSlot'
import { getGamesBySlugs } from '@/lib/games'
import {
  formatDate,
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  shouldPlaceInArticleAd,
} from '@/lib/posts'
import { absoluteUrl, site } from '@/lib/site'

/**
 * SEO ARTICLE TEMPLATE
 *
 * Structure: H1 → intro → table of contents → H2 sections → FAQ → related games.
 *
 * AD PLACEMENT ON THIS TEMPLATE (the only template with in-body ads):
 *   • <AdSlot variant="in-article" />  after every 2nd H2 section, never after the
 *     last one. The decision lives in shouldPlaceInArticleAd() in lib/posts.js so
 *     you can change the density in one place.
 *   • <AdSlot variant="sidebar" />    once, sticky, in the aside.
 * Both render a labelled dashed placeholder until NEXT_PUBLIC_ADSENSE_CLIENT and
 * the matching slot IDs are set.
 */

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: 'Article not found' }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    authors: [{ name: post.author }],
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: post.hero, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.hero],
    },
  }
}

export default function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const relatedGames = getGamesBySlugs(post.relatedGames)
  const morePosts = getRelatedPosts(post.slug, 2)
  const sectionId = (index) => `section-${index + 1}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      image: absoluteUrl(post.hero),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { '@type': 'Organization', name: post.author },
      publisher: { '@type': 'Organization', name: site.name, url: site.url },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': absoluteUrl(`/blog/${post.slug}`),
      },
    },
    {
      // FAQPage markup makes the FAQ block eligible for rich results.
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ]

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.category },
        ]}
      />

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ---------------------------------------------------------------- */}
        {/* ARTICLE COLUMN                                                    */}
        {/* ---------------------------------------------------------------- */}
        <article className="min-w-0">
          <header>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              {post.category}
            </span>

            {/* H1 — exactly one per page. */}
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl dark:text-white">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              <span>{post.author}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min read</span>
              {post.updatedAt !== post.publishedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatDate(post.updatedAt)}</span>
                </>
              )}
            </div>

            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-800">
              <Image
                src={post.hero}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 760px, 100vw"
                className="object-cover"
              />
            </div>
          </header>

          {/* Intro / lead. Slightly larger type than the body. */}
          <div className="prose-article mt-7 text-[1.125rem] leading-relaxed">
            {post.intro.map((paragraph, index) => (
              <p key={index} className={index === 0 ? 'font-medium text-ink-800 dark:text-ink-100' : ''}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Table of contents — jump links double as the sitelinks Google
              sometimes surfaces under the result. */}
          <nav
            aria-label="On this page"
            className="surface mt-8 p-5"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">
              On this page
            </h2>
            <ol className="mt-3 space-y-1.5 text-sm">
              {post.sections.map((section, index) => (
                <li key={sectionId(index)} className="flex gap-2">
                  <span className="text-ink-300">{index + 1}.</span>
                  <a
                    href={`#${sectionId(index)}`}
                    className="text-brand-600 hover:underline dark:text-brand-300"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
              <li className="flex gap-2">
                <span className="text-ink-300">{post.sections.length + 1}.</span>
                <a href="#faq" className="text-brand-600 hover:underline dark:text-brand-300">
                  Frequently asked questions
                </a>
              </li>
            </ol>
          </nav>

          {/* ---- H2 SECTIONS, with in-article ad slots between them ---- */}
          {post.sections.map((section, index) => (
            <section key={sectionId(index)} className="mt-10 scroll-mt-24" id={sectionId(index)}>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
                {section.heading}
              </h2>

              <div className="prose-article mt-3">
                {section.paragraphs.map((paragraph, pIndex) => (
                  <p key={pIndex}>{paragraph}</p>
                ))}
              </div>

              {section.list && (
                <ul className="prose-article mt-4 space-y-2">
                  {section.list.map((item, lIndex) => (
                    <li key={lIndex} className="flex gap-2.5">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* ============================================================
                * >>> IN-ARTICLE AD SLOT <<<
                * Placed after this H2 section when the density rule says so.
                * Blog template only — never on /games/[slug].
                * ============================================================ */}
              {shouldPlaceInArticleAd(index, post.sections.length) && (
                <AdSlot variant="in-article" />
              )}
            </section>
          ))}

          {/* ---- FAQ BLOCK (matches the FAQPage JSON-LD above) ---- */}
          <section id="faq" className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
              Frequently asked questions
            </h2>
            <div className="mt-4 divide-y divide-ink-200 overflow-hidden rounded-2xl border border-ink-200 dark:divide-ink-800 dark:border-ink-800">
              {post.faq.map((item, index) => (
                <details key={index} className="group bg-white open:bg-ink-50 dark:bg-ink-900 dark:open:bg-ink-800/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-ink-900 dark:text-white">
                    <h3 className="text-base">{item.q}</h3>
                    <svg
                      className="h-5 w-5 shrink-0 text-ink-400 transition-transform group-open:rotate-45"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <div className="prose-article px-5 pb-5 text-[15px]">{item.a}</div>
                </details>
              ))}
            </div>
          </section>

          {/* ---- Play-now block: sends article traffic into the game pages ---- */}
          {relatedGames.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
                Play the games from this article
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {relatedGames.map((game) => (
                  <li key={game.slug} className="flex">
                    <GameCard game={game} className="w-full" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {morePosts.length > 0 && (
            <section className="mt-12 border-t border-ink-200 pt-8 dark:border-ink-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Keep reading
              </h2>
              <ul className="mt-3 space-y-3">
                {morePosts.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/blog/${entry.slug}`}
                      className="font-semibold text-brand-600 hover:underline dark:text-brand-300"
                    >
                      {entry.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
                      {entry.excerpt}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        {/* ---------------------------------------------------------------- */}
        {/* SIDEBAR                                                           */}
        {/* ---------------------------------------------------------------- */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          {/* ==============================================================
            * >>> SIDEBAR AD SLOT <<<
            * One unit, sticky with the sidebar. Renders a dashed placeholder
            * until NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR is set.
            * ============================================================== */}
          <AdSlot variant="sidebar" />

          <div className="surface mt-6 p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">
              Popular right now
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {relatedGames.map((game) => (
                <li key={game.slug}>
                  <Link
                    href={`/games/${game.slug}`}
                    className="font-medium text-ink-700 hover:text-brand-600 dark:text-ink-200 dark:hover:text-brand-300"
                  >
                    {game.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/games"
              className="btn-secondary mt-4 w-full"
            >
              Browse all games
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
