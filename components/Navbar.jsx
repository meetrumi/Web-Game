'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import SearchBar from '@/components/SearchBar'
import ThemeToggle from '@/components/ThemeToggle'
import { nav, site } from '@/lib/site'

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [pathname])

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur
      dark:border-ink-800 dark:bg-ink-950/85">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${site.name} home`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-card">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M12 2 3 6.5v7C3 18.7 6.9 22 12 22s9-3.3 9-8.5v-7L12 2Zm-1 5h2v3h3v2h-3v3h-2v-3H8v-2h3V7Z" />
            </svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
            {site.name}
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive(item.href)
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Suspense boundary is required: SearchBar reads useSearchParams(), and
              without it every static page would deopt to client rendering. */}
          <Suspense fallback={<div className="hidden h-9 w-56 rounded-xl bg-ink-100 sm:block dark:bg-ink-800" />}>
            <SearchBar className="hidden w-56 sm:block lg:w-72" />
          </Suspense>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200
              text-ink-600 md:hidden dark:border-ink-700 dark:text-ink-300"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-ink-200 bg-white px-4 pb-4 pt-3 md:hidden dark:border-ink-800 dark:bg-ink-950">
          <Suspense fallback={null}>
            <SearchBar className="mb-3 sm:hidden" />
          </Suspense>
          <nav className="grid gap-1" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive(item.href)
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
