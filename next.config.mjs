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
