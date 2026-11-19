import { ImageResponse } from 'next/og'
import { site } from '@/lib/site'

// Default 1200×630 social share image (Facebook/X/WhatsApp do not accept SVG thumbnails).
export const runtime = 'edge'
export const alt = `${site.name} — ${site.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 80, background: 'linear-gradient(135deg,#0d1015 0%,#1e1b4b 100%)', color: 'white' }}>
        <div style={{ fontSize: 96, fontWeight: 800 }}>{site.name}</div>
        <div style={{ fontSize: 44, marginTop: 16, color: '#c7d2fe' }}>{site.tagline}</div>
        <div style={{ fontSize: 30, marginTop: 40, color: '#94a3b8' }}>Free • No downloads • Play in your browser</div>
      </div>
    ),
    size,
  )
}
