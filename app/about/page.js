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
      {/* >>> PLACEHOLDER COPY: replace with your own story before launch. AdSense
          reviewers read this page, and a generic About page is a common reason
          applications get held. Say who you are and why the site exists. <<< */}
      <p>
        {site.name} is a small, independently run collection of {getAllGames().length}{' '}
        browser games — idle games, clickers and short arcade titles that load in a single
        tab without a download, an installer or a plugin.
      </p>

      <h2>Why this site exists</h2>
      <p>
        Most browser game portals are unusable: five interstitials before the game loads,
        a video ad glued over the play area, and a thumbnail grid that takes eight seconds
        to render. We wanted the opposite — a fast page, one clean game frame, and nothing
        layered on top of the thing you came for.
      </p>
      <p>
        That is a real constraint rather than a slogan. The game viewport on every page is
        kept free of advertising, and the pages that carry ads carry them below the
        content, not over it.
      </p>

      <h2>How games get here</h2>
      <p>
        Every title is embedded from its publisher or from a licensed distribution
        partner. We do not host game files ourselves, and we do not modify or re-brand
        anyone&rsquo;s game. Titles and artwork stay the property of their creators.
      </p>
      <p>
        If you own a game that appears here and you would rather it did not, our{' '}
        <Link href="/dmca">DMCA page</Link> has the takedown process. One email is enough
        and we do not argue about it.
      </p>

      <h2>What we mean by &ldquo;unblocked&rdquo;</h2>
      <p>
        It means a game delivered as standard HTML5 over HTTPS with nothing to install.
        It does not mean the game will load on every network — filters are set by whoever
        runs the network, and we neither provide nor endorse ways around them. The longer
        answer is in{' '}
        <Link href="/blog/what-unblocked-really-means">this explainer</Link>.
      </p>

      <h2>Get in touch</h2>
      <p>
        Suggestions, bug reports and broken embeds all go to the same place — the{' '}
        <Link href="/contact">contact page</Link>. Broken-game reports are genuinely
        useful; third-party embeds break without warning and we cannot test all of them
        every day.
      </p>
    </LegalPage>
  )
}
