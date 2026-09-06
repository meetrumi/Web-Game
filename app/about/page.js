import Link from 'next/link'
import LegalPage from '@/components/LegalPage'
import { getAllGames } from '@/lib/games'
import { site } from '@/lib/site'

export const metadata = {
  title: 'About',
  description: `What ${site.name} is, who runs it, and how games get onto the site.`,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <LegalPage title={`About ${site.name}`}>
      <p>
        {site.name} is a curated collection of {getAllGames().length} browser-based idle,
        clicker, and arcade games that run straight in your browser — no downloads, no
        installs, and no third-party launchers.
      </p>

      <h2>Why this site exists</h2>
      <p>
        Most browser game portals have become unusable. Five interstitials before the game
        loads, video ads layered directly over the play area, and thumbnail grids that take
        eight seconds to render on a school Chromebook. We built ClickVault as the opposite:
        fast pages, clean game frames, and nothing stacked on top of the thing you came to
        play.
      </p>
      <p>
        That constraint is real, not marketing copy. Every game page keeps the viewport free
        of overlays and pop-ups during active gameplay. Ads appear below the game frame and
        in sidebars, never over it.
      </p>

      <h2>How games get here</h2>
      <p>
        Every title is embedded from its original publisher or from a licensed distribution
        partner via iframe. We do not host game files ourselves, re-skin anyone&rsquo;s work, or
        modify games. Titles and artwork remain the property of their creators.
      </p>
      <p>
        If you own a game that appears here and would rather it did not, our{' '}
        <Link href="/dmca">DMCA page</Link> has the takedown process. One email is enough,
        and we do not argue about it.
      </p>

      <h2>What we mean by &ldquo;unblocked&rdquo;</h2>
      <p>
        It means a game delivered as standard HTML5 over HTTPS with nothing to install.
        It does not mean the game will load on every network — filters are set by whoever
        runs the network, and we neither provide nor endorse workarounds. The longer
        explanation is in{' '}
        <Link href="/blog/what-unblocked-really-means">this article</Link>.
      </p>

      <h2>Get in touch</h2>
      <p>
        Broken games, suggestions, and partnership inquiries all go through the{' '}
        <Link href="/contact">contact page</Link>. Bug reports are genuinely helpful —
        third-party embeds break without warning, and we cannot test all of them every day.
      </p>
    </LegalPage>
  )
}
