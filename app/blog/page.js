import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '@/components/Breadcrumbs'
import { formatDate, getAllPosts } from '@/lib/posts'
import { site } from '@/lib/site'

export const metadata = {
  title: 'Blog — Guides & Explainers',
  description: `Guides, explainers and deep dives on idle games, clickers and browser gaming from the ${site.name} team.`,
  alternates: { canonical: '/blog' },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const [lead, ...rest] = posts

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
        Guides &amp; explainers
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] text-ink-500 dark:text-ink-400">
        How the genre actually works, what to play, and why some browser games load on a
        locked-down network and others do not.
      </p>

      {lead && (
        <Link
          href={`/blog/${lead.slug}`}
          className="surface group mt-8 grid overflow-hidden transition-colors hover:border-brand-300 sm:grid-cols-2 dark:hover:border-brand-700"
        >
          <div className="relative aspect-[16/10] bg-ink-100 sm:aspect-auto sm:h-full dark:bg-ink-800">
            <Image
              src={lead.hero}
              alt=""
              fill
              priority
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col p-6 sm:p-8">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              {lead.category} · Featured
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-snug text-ink-900 group-hover:text-brand-700 sm:text-2xl dark:text-white dark:group-hover:text-brand-300">
              {lead.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-500 dark:text-ink-400">
              {lead.excerpt}
            </p>
            <span className="mt-auto pt-5 text-xs text-ink-400">
              {formatDate(lead.publishedAt)} · {lead.readingMinutes} min read
            </span>
          </div>
        </Link>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {rest.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="surface group flex h-full flex-col overflow-hidden transition-colors hover:border-brand-300 dark:hover:border-brand-700"
            >
              <div className="relative aspect-[16/9] bg-ink-100 dark:bg-ink-800">
                <Image
                  src={post.hero}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                  {post.category}
                </span>
                <h2 className="mt-1.5 font-bold leading-snug text-ink-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                  {post.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-ink-500 dark:text-ink-400">
                  {post.excerpt}
                </p>
                <span className="mt-auto pt-4 text-xs text-ink-400">
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
