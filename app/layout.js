import '@/app/globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdSenseScript from '@/components/ads/AdSenseScript'
import AdsterraPopunder from '@/components/ads/AdsterraPopunder'
import { site } from '@/lib/site'

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'unblocked games',
    'idle games',
    'clicker games',
    'browser games',
    'no download games',
    'html5 games',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: site.locale,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: 'summary_large_image',
    site: site.twitter,
  },
  verification: {
    google: 'iwga6og7ZBusx-R1A29T1MPqBwLLKP5nE0ciKMg6AuI',
  },
  robots: { index: true, follow: true },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1015' },
  ],
}

/**
 * Sets the `dark` class before first paint so a dark-mode visitor never sees a
 * white flash. Must run synchronously in <head>, which is why it is a raw inline
 * script rather than next/script. Key must match ThemeToggle's STORAGE_KEY.
 */
const noFlashTheme = `
(function(){try{
  var stored = localStorage.getItem('cv:theme');
  var dark = stored ? stored === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />

        {/* Speeds up the first game embed by warming the DNS/TLS handshake for ad networks */}
        <link rel="dns-prefetch" href="//pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />

        {/* Google AdSense script in <head> for site verification and auto ads */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1621041383720121"
          crossOrigin="anonymous"
        />

        {/* Google AdSense account verification meta tag */}
        <meta name="google-adsense-account" content="ca-pub-1621041383720121" />

        {/* ==================================================================
          * >>> PLUG IN: ADSTERRA / OTHER NETWORK VERIFICATION TAGS <<<
          * ================================================================== */}
        {/* <meta name="adsterra-site-verification" content="XXXXXXXX" /> */}
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
            focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <Navbar />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer />

        {/* ==================================================================
          * SITE-WIDE AD SCRIPTS
          *
          * AdSense library + Auto ads. Renders nothing until
          * NEXT_PUBLIC_ADSENSE_CLIENT is set. See components/ads/AdSenseScript.jsx.
          * ================================================================== */}
        <AdSenseScript />

        {/* ==================================================================
          * ADSTERRA POPUNDER — fires at most ONCE PER SESSION.
          *
          * The sessionStorage gate, the user-gesture requirement and the
          * legal-page exclusions are all implemented in the component; the
          * script injection itself is commented out and marked PLUG IN.
          *
          * Mounted here (site-wide) on purpose. The Social Bar is NOT — that one
          * is mounted only by app/games/[slug]/page.js.
          *
          * READ FIRST: running an Adsterra popunder on the same pageview as
          * AdSense is the most common cause of an AdSense policy strike. Keep
          * NEXT_PUBLIC_ENABLE_POPUNDER=false until you have decided which of the
          * two networks matters more to you. Details in README.md.
          * ================================================================== */}
        <AdsterraPopunder />

        {/* ==================================================================
          * >>> OPTIONAL PLUG IN: analytics (GA4, Plausible, Umami…) <<<
          * ================================================================== */}
      </body>
    </html>
  )
}
