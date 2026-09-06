# ClickVault

A Next.js 14 (App Router) game portal for the **unblocked idle & clicker games** niche,
scaffolded for Adsterra + Google AdSense monetisation.

**15 playable games ship with it**, all written for this project and served as static files
from `public/games/` — no embeds, no third-party host, no licences to chase. See
[Games](#games) for how they are built.

No real smart links or ad network IDs are baked in — every one of them is an env var or a
clearly marked `>>> PLUG IN <<<` comment, and nothing is live until you switch it on.

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
| The games themselves | `public/games/<slug>/game.js` |
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

## Games

All 15 games are written for this project and served from `public/games/<slug>/index.html`.
None of them is an embed of someone else's game, so there is nothing here you need a licence
for and no third-party host to keep alive.

Because they are same-origin static files rather than a remote iframe, `localStorage` works
inside the frame — that is what makes high scores and idle-game saves persist. It is also why
`GameFrame` ships with its `sandbox` attribute commented out: sandboxing would sever
same-origin access and wipe every save. **Uncomment it the day you embed a game you did not
write** (see `components/GameFrame.jsx`).

### The runtime

`public/games/shared/core.js` is the whole engine, exposed as a single global, `window.CV`:

| | |
| --- | --- |
| `canvas(sel)` | DPR-aware canvas (capped at 2×) that re-fits on resize |
| `loop(fn)` | rAF loop with `dt` clamped at 0.05 s so a stalled tab cannot teleport anything |
| `keys()`, `pointer()`, `swipe()` | input, Pointer Events throughout — one code path for mouse and touch |
| `hud()`, `overlay()`, `toast()` | the shared chrome every game gets |
| `best(id, score)`, `save`, `load`, `wipe` | `localStorage` under `cv:game:`; `best` only writes on an improvement |
| `beep()`, `chord()`, `muteToggle()` | WebAudio, created lazily on the first real gesture so no browser blocks it |

Conventions the games follow, worth keeping if you add one:

- **A fixed design resolution, scaled at draw time.** Each game picks its own `W`/`H` and
  computes `u = min(view.h / H, view.w / W)`, so it plays identically on a phone in portrait
  and a desktop in landscape, letterboxed rather than reflowed.
- **Classic `<script src>`, ES5 syntax, no inline script.** No bundler and no build step for
  the games, and a strict CSP stays available to you later.
- **Procedural rather than stored content.** Slope Runner X's course, for instance, is a pure
  function of distance travelled — nothing to load, and identical on every device.
- **`if (!document.hidden) update(dt)`.** Games never advance in a background tab.

### The idle games

The seven tycoon games are configuration, not code: each one calls `CV.Idle.start({…})` from
`public/games/shared/idle.js` with its own producers, upgrades, prestige threshold and one
mechanic of its own — a golden cookie, a power grid that browns out, a combo window, an order
queue. The economy, the save format and offline accrual are shared, so a balance fix lands in
all seven at once.

### Adding a game

1. `public/games/my-game/index.html` — copy an existing one; it loads `../shared/core.js`
   then `game.js`, and nothing else.
2. `public/games/my-game/game.js` — wrap it in `(function (CV) { … })(window.CV)`.
3. Add the entry to `data/games.json` with `"iframeUrl": "/games/my-game/index.html"`.
4. `node scripts/generate-thumbnails.mjs` for a placeholder card image.

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
public/games/
  shared/core.js            the game runtime — one global, `window.CV`
  shared/idle.js            the idle/clicker engine the 7 tycoon games configure
  <slug>/index.html         one page per game, loads core.js then game.js
  <slug>/game.js            the game itself
scripts/
  generate-thumbnails.mjs   placeholder SVG generator
```

---

## Design notes

- **Mobile-first.** 2-column game grid on phones, 3 on tablet, 4 on desktop.
- **Dark mode** via a `dark` class on `<html>`, with an inline script in `app/layout.js`
  that applies it before first paint so there is no white flash. Falls back to
  `prefers-color-scheme`.
- **Click-to-play.** The game iframe is not created until the visitor asks for it, which keeps
  the game's canvas and audio out of your LCP entirely and means a visitor who only browsed
  never paid for it. Pass `autoLoad` to `<GameFrame>` if you want it eager.
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

- [x] ~~Replace every `iframeUrl` in `data/games.json` with a real embed URL~~ — all 15 point
      at bundled games under `public/games/`, so there is nothing external left to wire up
- [ ] **Replace the `plays` counts in `data/games.json`.** They are invented numbers used to
      sort the "popular" grid. Shipping them as-is puts fake social proof in front of visitors
      and in front of an AdSense reviewer — wire the field to real analytics or drop it from
      the card
- [ ] Replace the placeholder thumbnails with real artwork
- [ ] Set `NEXT_PUBLIC_SMARTLINK_URL`
- [ ] Rewrite `/about` in your own words — a generic About page holds up AdSense review
- [ ] Fill in every `[PLACEHOLDER]` in `/privacy-policy` and `/dmca`, and have the privacy
      policy reviewed by someone qualified
- [ ] Point `dns-prefetch` in `app/layout.js` at your real game host — or drop it, now that
      the games are same-origin and there is no third-party host to warm up
- [ ] Decide the AdSense-vs-popunder question above, and add a CMP if you serve the EEA/UK
- [ ] Exclude `/games/*` from Auto ads in the AdSense dashboard
- [ ] Leave `GameFrame`'s `sandbox` attribute commented out only while every game is your
      own; restore it the moment you embed a third party
