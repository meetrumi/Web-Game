import Link from 'next/link'
import { categories, legalNav, nav, site } from '@/lib/site'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
      <div className="container-page py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2 3 6.5v7C3 18.7 6.9 22 12 22s9-3.3 9-8.5v-7L12 2Zm-1 5h2v3h3v2h-3v3h-2v-3H8v-2h3V7Z" />
                </svg>
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
                {site.name}
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              {site.tagline}. Free browser games that load in one tab — nothing to
              download, nothing to install.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Browse</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Categories</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-300"
                  >
                    {category.name} Games
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Legal</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {legalNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-200 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between dark:border-ink-800">
          <p>
            © {year} {site.name}. All game titles and artwork belong to their respective
            owners.
          </p>
          <p>
            Games are embedded from third-party hosts. See our{' '}
            <Link href="/dmca" className="underline hover:text-brand-600">
              DMCA policy
            </Link>{' '}
            for takedown requests.
          </p>
        </div>
      </div>
    </footer>
  )
}
