/**
 * Single source of truth for site-wide branding, navigation and monetisation IDs.
 * Rename the site here and it changes everywhere (metadata, navbar, footer, JSON-LD).
 */

export const site = {
  name: 'ClickVault',
  tagline: 'Unblocked Idle & Clicker Games',
  description:
    'Play unblocked idle and clicker games straight in your browser. No downloads, no installs, no plugins — just open a tab and start the numbers going up.',
  // Falls back to production default or localhost for local testing
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://clickvault.games',
  locale: 'en_US',
  twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@clickvault',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@clickvault.games',
  dmcaEmail: process.env.NEXT_PUBLIC_DMCA_EMAIL || 'dmca@clickvault.games',
}

/** Category registry. Adding an entry here creates a working /category/<slug> page. */
export const categories = [
  {
    slug: 'unblocked',
    name: 'Unblocked',
    short: 'Unblocked',
    blurb:
      'Browser-native arcade games that load in a plain tab — no downloads, no launcher, no plugin.',
    description:
      'Unblocked games are plain HTML5 titles that run entirely in the browser. Everything in this collection loads from a single tab and works on low-spec hardware.',
  },
  {
    slug: 'idle-clicker',
    name: 'Idle & Clicker',
    short: 'Idle',
    blurb:
      'Numbers that keep going up whether you are watching or not. Prestige loops, offline earnings, one-tap upgrades.',
    description:
      'Idle and clicker games reward patience over reflexes. Tap to start the loop, buy the automation, then let the multipliers compound while you do something else.',
  },
]

/** Primary navigation. Used by both the navbar and the footer. */
export const nav = [
  { href: '/', label: 'Home' },
  { href: '/games', label: 'All Games' },
  { href: '/category/unblocked', label: 'Unblocked' },
  { href: '/category/idle-clicker', label: 'Idle & Clicker' },
  { href: '/blog', label: 'Blog' },
]

export const legalNav = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/dmca', label: 'DMCA' },
]

/**
 * Monetisation config, all read from env so no IDs are hard-coded in the repo.
 * See .env.local for what each one is.
 */
export const monetisation = {
  // "Claim Bonus" CTA under the game iframe.
  smartlinkUrl:
    process.env.NEXT_PUBLIC_SMARTLINK_URL || '',

  adsense: {
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '',
    autoAds: process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS !== 'false',
    slots: {
      inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || '',
      sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
    },
  },

  adsterra: {
    popunderKey: process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_KEY || '',
    socialBarKey: process.env.NEXT_PUBLIC_ADSTERRA_SOCIALBAR_KEY || '',
    popunderEnabled: process.env.NEXT_PUBLIC_ENABLE_POPUNDER === 'true',
    socialBarEnabled: process.env.NEXT_PUBLIC_ENABLE_SOCIALBAR === 'true',
  },
}

/**
 * Routes where no aggressive ad format (popunder, social bar, interstitial) should
 * ever fire. Legal and contact pages must stay clean: AdSense reviewers land on
 * them, and a popunder on a privacy policy is a fast route to a policy strike.
 */
export const adFreeRoutes = ['/privacy-policy', '/dmca', '/contact', '/about']

export function absoluteUrl(path = '/') {
  return new URL(path, site.url).toString()
}
