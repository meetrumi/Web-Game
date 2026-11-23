/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // The bundled placeholder thumbnails in /public/thumbs are SVGs, so SVG has to be
    // allowed through the image optimizer. The CSP below is the hardening Next.js
    // recommends when you do this (blocks scripts inside the SVG).
    //
    // >>> WHEN YOU SWAP IN REAL JPG/PNG/WEBP THUMBNAILS: delete these three lines. <<<
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // >>> PLUG IN: if your thumbnails live on a CDN / another host, whitelist it here.
    // remotePatterns: [
    //   { protocol: 'https', hostname: 'cdn.example.com', pathname: '/thumbs/**' },
    //   { protocol: 'https', hostname: 'img.gamedistribution.com' },
    // ],
  },

  // The idle/clicker collection was retired in Nov 2026. Permanent redirects keep the
  // search traffic and backlinks those URLs earned instead of serving 404s.
  async redirects() {
    const retired = [
      'cookie-empire-tycoon', 'idle-mine-shaft', 'click-kingdom', 'capybara-coin-farm',
      'idle-space-colony', 'burger-baron-idle', 'crystal-tap-tycoon',
    ]
    return [
      { source: '/category/idle-clicker', destination: '/category/puzzle', permanent: true },
      ...retired.map((slug) => ({ source: `/games/${slug}`, destination: '/category/puzzle', permanent: true })),
    ]
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // NOTE: deliberately NOT sending X-Frame-Options / frame-ancestors here.
          // Ad networks and game hosts break under a strict frame policy, and this
          // site is the *parent* frame, not the framed one.
        ],
      },
    ]
  },
}

export default nextConfig
