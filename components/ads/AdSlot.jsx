'use client'

import { useEffect, useRef } from 'react'
import { monetisation } from '@/lib/site'

const VARIANTS = {
  'in-article': {
    slotKey: 'inArticle',
    wrapper: 'my-10 min-h-[280px] sm:min-h-[250px]',
    format: 'fluid',
    layout: 'in-article',
  },
  sidebar: {
    slotKey: 'sidebar',
    wrapper: 'min-h-[600px]',
    format: 'auto',
    layout: null,
  },
}

/**
 * Renders a real ad only when both the publisher ID and the matching slot ID
 * are configured. Keeps unconfigured ad locations completely out of the UI.
 */
export default function AdSlot({ variant = 'in-article', className = '' }) {
  const config = VARIANTS[variant] || VARIANTS['in-article']
  const { client, slots } = monetisation.adsense
  const slotId = slots[config.slotKey]
  const pushed = useRef(false)

  useEffect(() => {
    if (!client || !slotId || pushed.current) return
    pushed.current = true

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // An ad blocker or a missing ad script can prevent the request.
    }
  }, [client, slotId])

  if (!client || !slotId) return null

  return (
    <div className={`${config.wrapper} ${className}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-ink-400">
        Advertisement
      </span>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={config.format}
        {...(config.layout ? { 'data-ad-layout': config.layout } : {})}
        data-full-width-responsive="true"
      />
    </div>
  )
}
