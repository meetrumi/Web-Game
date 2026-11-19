import { NextResponse } from 'next/server'
import { writeFile } from '@/lib/admin/github'
import { slugify } from '@/lib/admin/format'

export const dynamic = 'force-dynamic'
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX = 3 * 1024 * 1024

export async function POST(req) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file.' }, { status: 400 })
    const ext = TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 })
    if (file.size > MAX) return NextResponse.json({ error: 'Image must be under 3 MB.' }, { status: 400 })
    const base = slugify(String(form.get('name') || file.name).replace(/\.[^.]+$/, '')) || 'image'
    const path = `public/blog/${base}-${Date.now().toString(36)}.${ext}`
    await writeFile(path, Buffer.from(await file.arrayBuffer()), `Upload blog image ${path}`)
    return NextResponse.json({ ok: true, url: path.replace(/^public/, '') })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
