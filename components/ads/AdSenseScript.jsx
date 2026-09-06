import Script from 'next/script'
import { monetisation } from '@/lib/site'

/**
 * GOOGLE ADSENSE — site-wide loader + Auto ads.
 *
 * Mounted once in app/layout.js so the adsbygoogle library is available to every
 * page, including the manual <AdSlot /> units in the blog template.
 *
 * Auto ads let Google place units wherever it likes. That is fine on the blog and
 * on listing pages, but on /games/[slug] it can drop a unit right beside the game
 * frame — so the game page sets `data-page-url`-scoped exclusions via the
 * "Ad placement" controls in your AdSense dashboard. There is no code-level way to
 * exclude a region from Auto ads; you do it in the dashboard by excluding the
 * /games/* URL group. That is called out in README.md.
 *
 * >>> PLUG IN: set NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx and
 * uncomment the <Script> block below. Nothing renders until you do. <<<
 */

export default function AdSenseScript() {
  const { client, autoAds } = monetisation.adsense

  // No publisher ID yet -> render nothing at all. Keeps dev builds free of 400s
  // from ads-by-google and keeps Lighthouse honest while you are still building.
  if (!client) return null

  return (
    <>
      {/* ==================================================================
        * >>> PLUG IN: ADSENSE LIBRARY (site-wide) <<<
        *
        * strategy="afterInteractive" is the right one here: the tag has to run
        * on the client but must not block first paint or the game embed.
        * ================================================================== */}
      <Script
        id="adsbygoogle-lib"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      />

      {/* ==================================================================
        * >>> PLUG IN: ADSENSE AUTO ADS (site-wide) <<<
        *
        * Only needed if you want Auto ads on top of the manual units. Toggle it
        * with NEXT_PUBLIC_ADSENSE_AUTO_ADS=false without touching code.
        * ================================================================== */}
      {autoAds && (
        <Script id="adsbygoogle-auto" strategy="afterInteractive">
          {`
            (adsbygoogle = window.adsbygoogle || []).push({
              google_ad_client: "${client}",
              enable_page_level_ads: true,
              overlays: { bottom: true }
            });
          `}
        </Script>
      )}
    </>
  )
}
