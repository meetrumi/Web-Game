import Link from 'next/link'

/** Breadcrumb trail + matching BreadcrumbList JSON-LD for rich results. */
export default function Breadcrumbs({ items = [] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href ? (
                <Link href={item.href} className="hover:text-brand-600 dark:hover:text-brand-300">
                  {item.label}
                </Link>
              ) : (
                <span className="text-ink-500 dark:text-ink-300">{item.label}</span>
              )}
              {index < items.length - 1 && <span aria-hidden="true">/</span>}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
