/**
 * Generates the placeholder thumbnails in /public/thumbs from data/games.json and
 * data/posts.json.
 *
 *   npm run thumbs
 *
 * Every file it writes is a placeholder. When you have real artwork, drop your
 * images into /public/thumbs (or point `thumbnail` at your CDN) and stop running
 * this — it only ever writes files that are missing unless you pass --force.
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'thumbs')
const force = process.argv.includes('--force')

/** Deterministic hash so a slug always gets the same colours. */
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const PALETTES = [
  ['#1d3df5', '#7f3df5'],
  ['#0ea5a4', '#0d7490'],
  ['#f5761d', '#f5b41d'],
  ['#d61d68', '#8b1df5'],
  ['#1d9bf5', '#1d3df5'],
  ['#16a34a', '#0d9488'],
  ['#7c3aed', '#db2777'],
  ['#f59e0b', '#dc2626'],
]

function initials(title) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, (char) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]
  )
}

function svg({ title, label, width, height, seed }) {
  const n = hash(seed)
  const [from, to] = PALETTES[n % PALETTES.length]
  const angle = n % 90
  const cx = 20 + (n % 60)
  const cy = 25 + (n % 50)

  // The `<?xml ?>` prologue is load-bearing, not decoration. next/image sniffs the
  // file's magic bytes and Next 14 only recognises SVG from a `<?xml` prologue -- a
  // file starting with `<svg` is rejected with a 400 "isn't a valid image", even with
  // dangerouslyAllowSVG enabled. Keep the first line if you hand-edit these.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".38"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0v40" fill="none" stroke="#ffffff" stroke-opacity=".10" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  <circle cx="${(cx / 100) * width}" cy="${(cy / 100) * height}" r="${height * 0.55}" fill="url(#glow)"/>
  <text x="50%" y="46%" text-anchor="middle" dominant-baseline="middle"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="${Math.round(height * 0.3)}"
    font-weight="800" fill="#ffffff" fill-opacity=".95">${escapeXml(initials(title))}</text>
  <text x="50%" y="72%" text-anchor="middle"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="${Math.round(height * 0.075)}"
    font-weight="600" letter-spacing="1.5" fill="#ffffff" fill-opacity=".8">${escapeXml(label.toUpperCase())}</text>
</svg>
`
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const games = JSON.parse(await readFile(join(root, 'data', 'games.json'), 'utf8'))
  const posts = JSON.parse(await readFile(join(root, 'data', 'posts.json'), 'utf8'))

  const targets = [
    ...games.map((game) => ({
      file: game.thumbnail,
      title: game.title,
      label: game.category === 'idle-clicker' ? 'Idle & Clicker' : 'Unblocked',
      width: 800,
      height: 600,
      seed: game.slug,
    })),
    ...posts.map((post) => ({
      file: post.hero,
      title: post.category,
      label: post.slug.replace(/-/g, ' '),
      width: 1200,
      height: 675,
      seed: post.slug,
    })),
  ]

  let written = 0
  let skipped = 0

  for (const target of targets) {
    if (!target.file?.startsWith('/thumbs/')) {
      skipped += 1
      continue // points at a CDN or an external URL -- leave it alone
    }
    const outPath = join(root, 'public', target.file.replace(/^\//, ''))
    if (!force && (await exists(outPath))) {
      skipped += 1
      continue
    }
    await writeFile(outPath, svg(target), 'utf8')
    written += 1
  }

  console.log(`thumbs: ${written} written, ${skipped} skipped -> public/thumbs`)
  if (skipped && !force) console.log('  (pass --force to overwrite existing files)')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
