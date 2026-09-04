'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { adFreeRoutes, monetisation } from '@/lib/site'

/**
 * ADSTERRA POPUNDER — once per browser session, on first user gesture.
 *
 * Mounted once site-wide in app/layout.js. Renders no DOM.
 *
 * What the wrapper already does for you (this part is live):
 *   1. Bails out unless NEXT_PUBLIC_ENABLE_POPUNDER=true.
 *   2. Bails out on legal/contact pages (see `adFreeRoutes` in lib/site.js).
 *   3. Checks sessionStorage so the script is injected at most ONCE per session —
 *      a new tab or a browser restart is a new session, a reload is not.
 *   4. Waits for a real user gesture (pointerdown / keydown). Popunders that fire
 *      without one are blocked by every modern browser's popup blocker anyway.
 *
 * All you have to do is uncomment the injection block and set the env vars.
 */

const SESSION_KEY = 'cv:popunder:fired'

export default function AdsterraPopunder() {
  const pathname = usePathname()

  useEffect(() => {
    const { popunderEnabled, popunderKey } = monetisation.adsterra

    // --- Gate 1: master switch -------------------------------------------------
    if (!popunderEnabled) return

    // --- Gate 2: never on legal / contact / about pages -------------------------
    const isAdFree = adFreeRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
    if (isAdFree) return

    // --- Gate 3: once per session ----------------------------------------------
    // Wrapped in try/catch because sessionStorage throws in some privacy modes and
    // inside sandboxed frames. If we cannot read the flag we do nothing, which is
    // the safe failure direction (better a missed impression than one per pageview).
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return
    } catch {
      return
    }

    let hasFired = false

    const detach = () => {
      document.removeEventListener('pointerdown', fire)
      document.removeEventListener('keydown', fire)
    }

    function fire() {
      if (hasFired) return
      hasFired = true

      try {
        window.sessionStorage.setItem(SESSION_KEY, String(Date.now()))
      } catch {
        /* storage blocked — the in-memory hasFired flag still covers this page view */
      }
      detach()

      /* ====================================================================
       * >>> PLUG IN: ADSTERRA POPUNDER SCRIPT <<<
       *
       * Paste the tag Adsterra gives you here. It normally looks like a single
       * <script src="//<subdomain>.com/xx/yy/zz/invoke.js"> — put just the path
       * part in NEXT_PUBLIC_ADSTERRA_POPUNDER_KEY and uncomment this block.
       *
       * Injected imperatively rather than via next/script because it must not run
       * until the gates above have all passed.
       * ==================================================================== */
      // const script = document.createElement('script')
      // script.type = 'text/javascript'
      // script.async = true
      // script.src = `//pl${popunderKey}.profitableratecpm.com/${popunderKey}/invoke.js`
      // script.dataset.cfasync = 'false'
      // document.body.appendChild(script)

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.info(
          '[ads] Adsterra popunder would fire now (once per session). Key:',
          popunderKey || '<not set>'
        )
      }
    }

    // Popunders need a user gesture. `passive` keeps the listener off the
    // scroll-blocking path so this never costs input latency in the game.
    document.addEventListener('pointerdown', fire, { passive: true })
    document.addEventListener('keydown', fire)

    return detach
  }, [pathname])

  return null
}
