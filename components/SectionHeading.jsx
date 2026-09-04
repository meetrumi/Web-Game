import Link from 'next/link'

/** Section header used across listing pages: title, optional blurb, optional link. */
export default function SectionHeading({ title, blurb, href, linkLabel = 'View all', as = 'h2' }) {
  const Tag = as

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Tag className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl dark:text-white">
          {title}
        </Tag>
        {blurb && (
          <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">{blurb}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}
