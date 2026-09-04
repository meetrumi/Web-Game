'use client'

import { useEffect, useRef } from 'react'
import { monetisation } from '@/lib/site'

/**
 * MANUAL ADSENSE UNIT — used by the blog template only.
 *
 *   <AdSlot variant="in-article" />   between H2 sections in app/blog/[slug]/page.js
 *   <AdSlot variant="sidebar" />      in the blog sidebar
 *
 * Behaviour:
 *   • No NEXT_PUBLIC_ADSENSE_CLIENT set -> renders a labelled dashed placeholder so
 *     you can see exactly where each unit will land while you build.
 *   • Client ID set -> renders the real <ins class="adsbygoogle"> (uncomment it).
 *
 * The wrapper always reserves height. Ad units that collapse to 0px and then expand
 * are the main source of layout shift on article pages, and CLS is scored on the
 * whole page — including the part the reader never scrolls to.
 *
 * NOTE: intentionally never used on /games/[slug]. Keep the game viewport clean.
 */

const VARIANTS = {
  'in-article': {
    slotKey: 'inArticle',
    label: 'In-article ad',
    // Responsive fluid unit: tall enough on mobile, shorter on desktop.
    wrapper: 'my-10 min-h-[280px] sm:min-h-[250px]',
    format: 'fluid',
    layout: 'in-article',
  },
  sidebar: {
    slotKey: 'sidebar',
    label: 'Sidebar ad',
    wrapper: 'min-h-[600px]',
    format: 'auto',
    layout: null,
  },
}

export default function AdSlot({ variant = 'in-article', className = '' }) {
  const config = VARIANTS[variant] || VARIANTS['in-article']
  const { client, slots } = monetisation.adsense
  const slotId = slots[config.slotKey]
  const pushed = useRef(false)

  useEffect(() => {
    if (!client || !slotId) return
    // React 18 StrictMode double-invokes effects in dev; adsbygoogle throws
    // "All ins elements already have ads" if you push the same slot twice.
    if (pushed.current) return
    pushed.current = true

    /* ==================================================================
     * >>> PLUG IN: uncomment to request the unit from AdSense. <<<
     * ================================================================== */
    // try {
    //   ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    // } catch {
    //   /* library blocked by an ad blocker — nothing to do */
    // }
  }, [client, slotId])

  // ---- Build-time placeholder ------------------------------------------------
  if (!client || !slotId) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed
          border-ink-300 bg-ink-100/60 text-center dark:border-ink-700 dark:bg-ink-900/60
          ${config.wrapper} ${className}`}
        aria-hidden="true"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {config.label}
        </span>
        <span className="px-4 text-[11px] text-ink-400">
          slot: {config.slotKey} — set NEXT_PUBLIC_ADSENSE_CLIENT to activate
        </span>
      </div>
    )
  }

  // ---- Live unit -------------------------------------------------------------
  return (
    <div className={`${config.wrapper} ${className}`}>
      {/* AdSense requires ad units to be labelled when they could be mistaken for
          site content. "Advertisement" is the wording Google's policy suggests. */}
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-ink-400">
        Advertisement
      </span>

      {/* ==================================================================
        * >>> PLUG IN: uncomment the <ins> below once your slot IDs are set. <<<
        * ================================================================== */}
      {/*
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={config.format}
        {...(config.layout ? { 'data-ad-layout': config.layout } : {})}
        data-full-width-responsive="true"
      />
      */}
    </div>
  )
}
