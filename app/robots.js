import { absoluteUrl } from '@/lib/site'

/** Generates /robots.txt. Both ad networks crawl the site, so nothing is blocked. */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /games?q= produces duplicate listing pages; keep them out of the index.
        disallow: ['/games?q=', '/api/'],
      },
      // AdSense needs its own crawler to reach every page it may serve ads on.
      { userAgent: 'Mediapartners-Google', allow: '/' },
      { userAgent: 'AdsBot-Google', allow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
