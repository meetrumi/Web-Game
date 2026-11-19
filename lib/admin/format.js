/**
 * Converts between the simple text the admin types and the structured post shape the
 * blog template renders (intro → H2 sections → lists → FAQ).
 *
 * Body format:
 *   Paragraphs before the first "## " heading become the intro.
 *   "## Heading" starts a new section. Blank lines separate paragraphs. "- item" lines become a bullet list.
 * FAQ format:
 *   Q: question
 *   A: answer
 */
export function bodyToStructure(body = '') {
  const intro = []
  const sections = []
  let current = null
  const blocks = body.replace(/\r/g, '').split(/\n{2,}/)
  for (const raw of blocks) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('## ')) {
        current = { heading: line.slice(3).trim(), paragraphs: [] }
        sections.push(current)
      } else if (/^[-*] /.test(line)) {
        if (!current) { current = { heading: 'Overview', paragraphs: [] }; sections.push(current) }
        current.list = [...(current.list || []), line.slice(2).trim()]
      } else {
        const rest = [line]
        while (i + 1 < lines.length && !lines[i + 1].startsWith('## ') && !/^[-*] /.test(lines[i + 1])) rest.push(lines[++i])
        const para = rest.join(' ')
        current ? current.paragraphs.push(para) : intro.push(para)
      }
    }
  }
  return { intro, sections }
}

export function structureToBody(post) {
  const out = [...(post.intro || [])]
  for (const s of post.sections || []) {
    out.push(`## ${s.heading}`)
    out.push(...(s.paragraphs || []))
    if (s.list?.length) out.push(s.list.map((l) => `- ${l}`).join('\n'))
  }
  return out.join('\n\n')
}

export function faqToText(faq = []) {
  return faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')
}

export function textToFaq(text = '') {
  const faq = []
  let cur = null
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const t = line.trim()
    if (/^Q:/i.test(t)) { cur = { q: t.slice(2).trim(), a: '' }; faq.push(cur) }
    else if (/^A:/i.test(t) && cur) cur.a = t.slice(2).trim()
    else if (t && cur) cur.a = `${cur.a} ${t}`.trim()
  }
  return faq.filter((f) => f.q && f.a)
}

export function slugify(str = '') {
  return str.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80)
}

export function readingMinutes(post) {
  const words = [...(post.intro || []), ...(post.sections || []).flatMap((s) => [s.heading, ...(s.paragraphs || []), ...(s.list || [])])]
    .join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}
