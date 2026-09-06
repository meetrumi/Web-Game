import Link from 'next/link'
import LegalPage from '@/components/LegalPage'
import ContactForm from '@/components/ContactForm'
import { site } from '@/lib/site'

export const metadata = {
  title: 'Contact',
  description: `Get in touch with the ${site.name} team about a broken game, a suggestion, a partnership or a takedown request.`,
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <LegalPage title="Contact us">
      <p>
        Fastest route for anything: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        We read everything and reply to most things within two working days.
      </p>

      <h2>What to send where</h2>
      <ul>
        <li>
          <strong>A game will not load</strong> — tell us the game name and your browser.
          Third-party embeds break often and we usually cannot see it from here.
        </li>
        <li>
          <strong>Suggest a game</strong> — send the link. Browser-native HTML5 only; we
          cannot host downloads or installers.
        </li>
        <li>
          <strong>Copyright / takedown</strong> — please use the process on our{' '}
          <Link href="/dmca">DMCA page</Link> instead, so nothing gets lost.
        </li>
        <li>
          <strong>Advertising and partnerships</strong> — email{' '}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> with
          &ldquo;Partnership&rdquo; in the subject line.
        </li>
      </ul>

      <h2>Send a message</h2>
      <ContactForm />
    </LegalPage>
  )
}
