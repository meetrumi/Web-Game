'use client'

import { useEffect } from 'react'
import { monetisation } from '@/lib/site'

/**
 * ADSTERRA SOCIAL BAR — /games/[slug] pages ONLY.
 *
 * This component is deliberately NOT in app/layout.js. It is mounted from
 * app/games/[slug]/page.js and nowhere else, so the Social Bar can never appear
 * on the homepage, the blog or any legal page.
 *
 * The Social Bar is a fixed-position overlay. It docks to the bottom of the
 * viewport, which is why the game page reserves bottom padding for it — see the
 * `pb-24` on the game page wrapper. That reserved space is what keeps the bar off
 * the game canvas.
 */

export default function AdsterraSocialBar() {
  useEffect(() => {
    const { socialBarEnabled, socialBarKey } = monetisation.adsterra
    if (!socialBarEnabled) return

    /* ======================================================================
     * >>> PLUG IN: ADSTERRA SOCIAL BAR SCRIPT <<<
     *
     * Paste the Social Bar tag here. Adsterra serves it as a single external
     * script; put its key in NEXT_PUBLIC_ADSTERRA_SOCIALBAR_KEY, uncomment the
     * five lines below, and set NEXT_PUBLIC_ENABLE_SOCIALBAR=true.
     *
     * The cleanup function removes the script AND anything it appended to
     * <body> on unmount. Without that, client-side navigating away from a game
     * page leaves the bar stuck on the next page — which is exactly the
     * cross-page leakage this component exists to prevent.
     * ====================================================================== */

    // const script = document.createElement('script')
    // script.src = `//pl${socialBarKey}.profitableratecpm.com/${socialBarKey}/invoke.js`
    // script.async = true
    // script.dataset.cfasync = 'false'
    // script.dataset.adSocialBar = 'true'
    // document.body.appendChild(script)

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.info(
        '[ads] Adsterra Social Bar would mount on this game page. Key:',
        socialBarKey || '<not set>'
      )
    }

    return () => {
      // Remove the tag itself...
      document
        .querySelectorAll('script[data-ad-social-bar="true"]')
        .forEach((node) => node.remove())

      /* ...and the containers Adsterra injects. Inspect the DOM once the real
       * script is live and add its wrapper's id/class to this list. Common ones
       * are left here as a starting point.
       *
       * document
       *   .querySelectorAll('[id^="social-bar"], .adsterra-social-bar')
       *   .forEach((node) => node.remove())
       */
    }
  }, [])

  return null
}
