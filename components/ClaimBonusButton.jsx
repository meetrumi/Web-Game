'use client'

import { monetisation } from '@/lib/site'

/**
 * "Claim Bonus" CTA — the outbound smart link, placed under the game frame.
 *
 * >>> PLUG IN: set NEXT_PUBLIC_SMARTLINK_URL in .env.local. The default is a
 * harmless example.com placeholder so nothing points anywhere real until you
 * change it. <<<
 *
 * Styling: uses `.btn-bonus` from app/globals.css — same radius, weight and press
 * behaviour as the site's own buttons, on the accent ramp. It reads as a first-party
 * promo rather than a display ad, which is what you asked for.
 *
 * Two things kept in deliberately, both one-liners to remove if you disagree:
 *
 *  • rel="sponsored nofollow noopener noreferrer" — `sponsored` is what Google asks
 *    for on monetised outbound links, and omitting it is a link-scheme problem for
 *    the whole domain, not just this page. `noopener` also stops the destination
 *    reaching back into this window via window.opener.
 *  • The small "Sponsored" line under the button. AdSense's deceptive-layout policy
 *    is specifically about monetised elements a reader would mistake for site
 *    navigation, so a button that looks native needs the label to stay compliant.
 *    Set `showDisclosure={false}` to drop it.
 */

export default function ClaimBonusButton({
  label = 'Claim Bonus',
  subLabel = 'Unlock the daily reward',
  showDisclosure = true,
  className = '',
}) {
  const href = monetisation.smartlinkUrl

  return (
    <div className={className}>
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="btn-bonus w-full sm:w-auto"
        data-cta="claim-bonus"
        onClick={() => {
          /* >>> OPTIONAL PLUG IN: click tracking.
             window.gtag?.('event', 'claim_bonus_click', { game: window.location.pathname }) */
        }}
      >
        {/* Sheen sweep — pure CSS, respects prefers-reduced-motion via globals.css. */}
        <span
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-shine
            bg-gradient-to-r from-transparent via-white/45 to-transparent"
          aria-hidden="true"
        />
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12 2 9.6 7.8 3.3 8.4l4.8 4.2-1.4 6.2L12 15.6l5.3 3.2-1.4-6.2 4.8-4.2-6.3-.6L12 2Z" />
        </svg>
        <span className="relative">{label}</span>
        <svg viewBox="0 0 24 24" className="relative h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </a>

      <p className="mt-1.5 text-xs text-ink-400">
        {subLabel}
        {showDisclosure && (
          <>
            {' · '}
            <span className="uppercase tracking-wide">Sponsored</span>
            {' · opens in a new tab'}
          </>
        )}
      </p>
    </div>
  )
}
