'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

/**
 * Search bar. Submits to /games?q=... which filters the listing server-side.
 * Small enough to be worth wiring up properly rather than leaving inert.
 */

export default function SearchBar({ className = '', autoFocus = false }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') || '')

  const onSubmit = (event) => {
    event.preventDefault()
    const q = value.trim()
    router.push(q ? `/games?q=${encodeURIComponent(q)}` : '/games')
  }

  return (
    <form role="search" onSubmit={onSubmit} className={`relative ${className}`}>
      <label htmlFor="site-search" className="sr-only">
        Search games
      </label>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="site-search"
        name="q"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search games…"
        autoComplete="off"
        className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm
          text-ink-800 placeholder:text-ink-400 focus:border-brand-400
          dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500"
      />
    </form>
  )
}
