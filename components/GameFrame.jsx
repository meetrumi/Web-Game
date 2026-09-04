'use client'

import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

/**
 * ============================================================================
 *  GAME VIEWPORT — POLICY-CLEAN ZONE
 *
 *  Do NOT place any ad unit, overlay, banner or interstitial inside this
 *  component or absolutely positioned over it. Both AdSense and Adsterra treat
 *  an ad layered on interactive content as accidental-click bait, and it is one
 *  of the fastest ways to lose an AdSense account.
 *
 *  Ads on this page belong BELOW the control bar. See app/games/[slug]/page.js —
 *  the safe zones are marked there.
 * ============================================================================
 *
 * Click-to-play by default: the third-party iframe is not created until the user
 * asks for it. That keeps the game host's JS out of your Largest Contentful Paint
 * and off the critical path entirely. Pass `autoLoad` to embed immediately.
 */

export default function GameFrame({ game, autoLoad = false }) {
  const [playing, setPlaying] = useState(autoLoad)
  const wrapperRef = useRef(null)

  const toggleFullscreen = useCallback(() => {
    const element = wrapperRef.current
    if (!element) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      element.requestFullscreen?.().catch(() => {
        /* refused (iOS Safari on iPhone has no element fullscreen) — ignore */
      })
    }
  }, [])

  return (
    <div>
      <div
        ref={wrapperRef}
        className="game-stage relative w-full overflow-hidden rounded-2xl border border-ink-200
          bg-ink-900 shadow-card dark:border-ink-800"
      >
        {playing ? (
          <iframe
            // >>> PLUG IN: game.iframeUrl comes from data/games.json. Replace the
            // placeholder URLs there with your real embed URLs. <<<
            src={game.iframeUrl}
            title={`Play ${game.title}`}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; gamepad; clipboard-write; cross-origin-isolated"
            // Both attributes are deliberate. Chrome logs a benign notice that `allow`
            // takes precedence; `allowFullScreen` is the fallback for Safari < 16.4,
            // which ignores `allow`. Dropping either one costs you fullscreen somewhere.
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            /* Third-party game embeds are untrusted code. If a game still works with
               this on, keep it — it stops the frame navigating your top-level page.
               Some engines need `allow-popups` or `allow-modals` added; a few break
               entirely, in which case delete the attribute for that game.
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups-to-escape-sandbox" */
          />
        ) : (
          /* Poster / click-to-play state. Also the only place a "loading" visual
             should live — never a sponsored one. */
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-4"
            aria-label={`Play ${game.title}`}
          >
            <Image
              src={game.thumbnail}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover opacity-40 blur-sm transition-opacity group-hover:opacity-55"
            />
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-white shadow-xl transition-transform duration-200 group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9" fill="currentColor" aria-hidden="true">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
              </svg>
            </span>
            <span className="relative text-lg font-bold text-white drop-shadow">
              Play {game.title}
            </span>
            <span className="relative text-xs font-medium text-white/70">
              Loads instantly — no download required
            </span>
          </button>
        )}
      </div>

      {/* Control bar sits BELOW the frame, never over it. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleFullscreen} className="btn-secondary">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
          </svg>
          Fullscreen
        </button>

        {playing && (
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className="btn-secondary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
            </svg>
            Restart
          </button>
        )}

        <p className="ml-auto text-xs text-ink-400">
          Trouble loading? Try a hard refresh (Ctrl + Shift + R).
        </p>
      </div>
    </div>
  )
}
