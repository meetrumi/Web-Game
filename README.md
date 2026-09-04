# ClickVault

A Next.js 14 (App Router) game portal for the **unblocked idle & clicker games** niche,
scaffolded for Adsterra + Google AdSense monetisation.

Everything runs locally with placeholder data. No real game URLs, smart links or ad
network IDs are baked in — every one of them is an env var or a clearly marked
`>>> PLUG IN <<<` comment.

---

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>. No `.env.local` is needed to boot — the site falls back to
safe placeholders and ad slots render as labelled dashed boxes.

Other scripts:

```bash
npm run build
```

```bash
npm run thumbs
```

(`thumbs` regenerates the placeholder SVG thumbnails from `data/games.json`; it skips files
that already exist unless you pass `--force`.)

---

## What to change first

Copy the env template and fill in what you have:

```bash
cp .env.local.example .env.local
```

| Thing you want to change | Where |
| --- | --- |
| Site name, tagline, emails, nav links | `lib/site.js` |
| Categories (adding one creates a working `/category/<slug>` page) | `lib/site.js` |
| Games, embed URLs, thumbnails | `data/games.json` |
| Blog articles | `data/posts.json` |
| Brand colours | `tailwind.config.js` → `theme.extend.colors` |
| Smart link destination | `NEXT_PUBLIC_SMARTLINK_URL` |
| AdSense / Adsterra IDs | `.env.local` |

---

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | static | Hero, featured / popular / per-category / newest grids, blog teasers, SEO copy |
| `/games` | dynamic | Full catalogue; also the search target (`/games?q=…`) |
| `/games/[slug]` | static (15 pages) | 16:9 game frame above the fold, Claim Bonus CTA, Social Bar mount |
| `/category/unblocked` | static | |
| `/category/idle-clicker` | static | |
| `/blog` | static | |
| `/blog/[slug]` | static (3 pages) | SEO article template with in-article + sidebar ad slots |
| `/about`, `/contact`, `/privacy-policy`, `/dmca` | static | Placeholder legal copy |
| `/sitemap.xml`, `/robots.txt` | generated | Built from the same data as the pages |

Both category pages come from one `app/category/[slug]/page.js` with
`generateStaticParams()` + `dynamicParams = false`, so exactly the two slugs in
`lib/site.js` exist and anything else is a hard 404.

---

## Ad integration map

Nothing is live. Each item below is wired up with its gating logic already working and the
actual network script commented out behind a `>>> PLUG IN <<<` marker.

| Format | Component | Mounted where | Gating that already works |
| --- | --- | --- | --- |
| Adsterra **popunder** | `components/ads/AdsterraPopunder.jsx` | `app/layout.js` (site-wide) | `NEXT_PUBLIC_ENABLE_POPUNDER`, **once per session** via `sessionStorage`, requires a real user gesture, skipped on legal pages |
| Adsterra **Social Bar** | `components/ads/AdsterraSocialBar.jsx` | `app/games/[slug]/page.js` **only** | `NEXT_PUBLIC_ENABLE_SOCIALBAR`, unmount cleanup so it cannot leak onto other routes |
| AdSense library + **Auto ads** | `components/ads/AdSenseScript.jsx` | `app/layout.js` (site-wide) | renders nothing until `NEXT_PUBLIC_ADSENSE_CLIENT` is set; `NEXT_PUBLIC_ADSENSE_AUTO_ADS=false` disables Auto ads only |
| AdSense **in-article** unit | `components/ads/AdSlot.jsx` | `app/blog/[slug]/page.js`, between H2 sections | density rule in `lib/posts.js` → `shouldPlaceInArticleAd()`; never after the last section |
| AdSense **sidebar** unit | `components/ads/AdSlot.jsx` | `app/blog/[slug]/page.js` sidebar | sticky, height reserved to avoid layout shift |

### The game viewport is a no-ad zone

`components/GameFrame.jsx` and the top of `app/games/[slug]/page.js` are both marked as
policy-clean. Nothing sponsored sits above the frame, over it, or beside it — the first
ad-safe position on a game page is below the "How to play / Details" cards, and it is
commented as such.

One thing you cannot do in code: **Auto ads ignore region hints.** To keep Google from
dropping a unit next to the game frame, go to AdSense → Ads → *By URL group* and exclude
`/games/*`, then place manual units only below the marked line.

### Two things worth knowing before you switch anything on

1. **A popunder on the same pageview as AdSense is the most common way to lose an AdSense
   account.** Google's policy on disruptive interstitials and its "no other network's
   popunders" stance are enforced by automated review, and the popunder does not have to be
   yours for the strike to land on you. `NEXT_PUBLIC_ENABLE_POPUNDER` ships as `false` on
   purpose. Realistically you pick one: AdSense (higher RPM, strict) or Adsterra popunders
   (lower RPM, permissive). Running both on the same URLs is the risky path — if you want
   both networks, split them by route.
2. **EEA/UK traffic with personalised ads needs a certified IAB TCF consent management
   platform** before AdSense will serve. There is no CMP in this scaffold; add one (Google's
   own funding-choices CMP is free) and note it in the privacy policy.

---

## Project layout

```
app/
  layout.js                 root layout, no-flash theme script, site-wide ad mounts
  page.js                   homepage
  globals.css               Tailwind layers + component classes
  games/page.js             catalogue + search results
  games/[slug]/page.js      game page  (Social Bar mounted here only)
  category/[slug]/page.js   /category/unblocked and /category/idle-clicker
  blog/page.js              blog index
  blog/[slug]/page.js       SEO article template  (in-article + sidebar ad slots)
  about|contact|privacy-policy|dmca/page.js
  sitemap.js  robots.js  not-found.js  icon.svg
components/
  Navbar  Footer  Hero  GameCard  GameGrid  GameFrame  ClaimBonusButton
  SearchBar  ThemeToggle  Breadcrumbs  SectionHeading  LegalPage
  ads/  AdSenseScript  AdSlot  AdsterraPopunder  AdsterraSocialBar
data/
  games.json                15 games (8 unblocked, 7 idle-clicker)
  posts.json                3 articles
lib/
  site.js                   branding, nav, categories, monetisation config
  games.js                  game queries + formatters
  posts.js                  post queries + ad density rule
scripts/
  generate-thumbnails.mjs   placeholder SVG generator
```

---

## Design notes

- **Mobile-first.** 2-column game grid on phones, 3 on tablet, 4 on desktop.
- **Dark mode** via a `dark` class on `<html>`, with an inline script in `app/layout.js`
  that applies it before first paint so there is no white flash. Falls back to
  `prefers-color-scheme`.
- **Click-to-play.** The third-party game iframe is not created until the visitor asks for
  it, which keeps the game host's JavaScript out of your LCP entirely. Pass
  `autoLoad` to `<GameFrame>` if you want the old behaviour.
- **Lazy images.** `next/image` everywhere; `priorityCount` on `<GameGrid>` opts the
  above-the-fold thumbnails out of lazy loading.
- **Search** submits to `/games?q=…` and filters server-side — a working version of the
  placeholder you asked for.
- **Structured data.** `WebSite` + `SearchAction` on the homepage, `VideoGame` on game
  pages, `CollectionPage` + `ItemList` on categories, `Article` + `FAQPage` on articles,
  `BreadcrumbList` everywhere.

### Placeholder thumbnails and `dangerouslyAllowSVG`

The bundled thumbnails are generated SVGs, so `next.config.mjs` enables
`dangerouslyAllowSVG` together with the CSP hardening Next.js recommends alongside it.
**When you swap in real JPG/PNG/WebP artwork, delete those three lines** and add your CDN to
`images.remotePatterns` instead.

If you hand-edit an SVG in `public/thumbs`, keep its `<?xml version="1.0"?>` first line.
Next 14 identifies SVGs by magic bytes and only recognises the `<?xml` prologue — a file
starting straight in at `<svg` comes back from `/_next/image` as a 400 even with
`dangerouslyAllowSVG` on.

---

## Deploying to Vercel

```bash
npx vercel
```

Then, in the Vercel dashboard, add every variable from `.env.local.example` to
Project → Settings → Environment Variables, and set `NEXT_PUBLIC_SITE_URL` to your real
domain (it feeds canonical URLs, OG tags and the sitemap). Redeploy after changing it —
these are build-time inlined values, not runtime lookups.

---

## Before you go live

- [ ] Replace every `iframeUrl` in `data/games.json` with a real embed URL
- [ ] Replace the placeholder thumbnails with real artwork
- [ ] Set `NEXT_PUBLIC_SMARTLINK_URL`
- [ ] Rewrite `/about` in your own words — a generic About page holds up AdSense review
- [ ] Fill in every `[PLACEHOLDER]` in `/privacy-policy` and `/dmca`, and have the privacy
      policy reviewed by someone qualified
- [ ] Point `dns-prefetch` in `app/layout.js` at your real game host
- [ ] Decide the AdSense-vs-popunder question above, and add a CMP if you serve the EEA/UK
- [ ] Exclude `/games/*` from Auto ads in the AdSense dashboard
