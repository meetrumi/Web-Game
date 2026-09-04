'use client'

import { useEffect, useState } from 'react'

/**
 * Dark mode toggle. Writes `dark` onto <html> and remembers the choice in
 * localStorage. The no-flash inline script that reads this key on first paint
 * lives in app/layout.js — the two must stay in sync on the key name.
 */

const STORAGE_KEY = 'cv:theme'

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(null) // null until we've read the DOM

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage blocked — the toggle still works for this page view */
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200
        text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800
        dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white
        ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title="Toggle dark mode"
    >
      {/* Both icons are rendered and swapped with CSS so the button is correct on the
          server render too, before the theme state has been read. */}
      <svg
        className="h-[18px] w-[18px] dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
      <svg
        className="hidden h-[18px] w-[18px] dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  )
}
