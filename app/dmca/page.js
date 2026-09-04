import Link from 'next/link'
import LegalPage from '@/components/LegalPage'
import { site } from '@/lib/site'

export const metadata = {
  title: 'DMCA & Copyright Policy',
  description: `How to submit a copyright takedown notice or counter-notice to ${site.name}.`,
  alternates: { canonical: '/dmca' },
}

export default function DmcaPage() {
  return (
    <LegalPage title="DMCA & Copyright Policy" updated="4 September 2026">
      {/* ====================================================================
        * >>> PLACEHOLDER — TEMPLATE, NOT LEGAL ADVICE <<<
        *
        * Fill in the bracketed fields. If you want DMCA safe-harbour protection
        * in the US you must also register a designated agent with the US
        * Copyright Office (there is a fee, and the registration expires) —
        * publishing this page alone does not give you safe harbour.
        * ==================================================================== */}
      <p>
        {site.name} respects copyright. We do not host game files: every game on this site
        is embedded in an iframe from its publisher or from a licensed distribution
        partner, and thumbnails are used to identify those games.
      </p>
      <p>
        If you own the rights to something that appears here and you want it removed, tell
        us and we will remove it. You do not need a lawyer and we will not argue about it.
      </p>

      <h2>Fastest route</h2>
      <p>
        Email <a href={`mailto:${site.dmcaEmail}`}>{site.dmcaEmail}</a> with the URL of the
        page and what you own. That is enough for us to act. The formal notice below exists
        because the statute asks for it, not because we need it to take something down.
      </p>

      <h2>Submitting a formal DMCA notice</h2>
      <p>
        Under 17 U.S.C. § 512(c)(3), a valid notice must include all of the following:
      </p>
      <ul>
        <li>
          A physical or electronic signature of the copyright owner, or a person authorised
          to act on their behalf.
        </li>
        <li>
          Identification of the copyrighted work claimed to have been infringed. If several
          works are covered by a single notice, a representative list is fine.
        </li>
        <li>
          Identification of the material you say is infringing, with enough detail for us
          to locate it — a direct URL on this site is ideal.
        </li>
        <li>
          Your contact information: name, postal address, telephone number and email
          address.
        </li>
        <li>
          A statement that you have a good-faith belief that the use is not authorised by
          the copyright owner, its agent, or the law.
        </li>
        <li>
          A statement that the information in the notice is accurate, and — under penalty
          of perjury — that you are the owner or are authorised to act on the owner&rsquo;s
          behalf.
        </li>
      </ul>

      <h2>Designated agent</h2>
      <p>
        [PLACEHOLDER — fill in before launch:]
        <br />
        Designated Agent: [Name]
        <br />
        {site.name}, [Company or trading name]
        <br />
        [Street address]
        <br />
        [City, region, postcode, country]
        <br />
        Email: <a href={`mailto:${site.dmcaEmail}`}>{site.dmcaEmail}</a>
        <br />
        Telephone: [Number]
      </p>

      <h2>What happens next</h2>
      <ul>
        <li>
          We aim to acknowledge notices within <strong>2 business days</strong> and to
          remove or disable access to the material within{' '}
          <strong>5 business days</strong> of a valid notice.
        </li>
        <li>
          Where we can identify the uploader or embed source, we will pass the notice on to
          them.
        </li>
        <li>
          Repeat infringement by a source we embed from will result in that source being
          dropped entirely.
        </li>
      </ul>

      <h2>Counter-notice</h2>
      <p>
        If your material was removed and you believe that was a mistake or a
        misidentification, you may send a counter-notice to{' '}
        <a href={`mailto:${site.dmcaEmail}`}>{site.dmcaEmail}</a> including: your
        signature; identification of the removed material and where it appeared; a
        statement under penalty of perjury that you have a good-faith belief the removal
        was a mistake; your name, address and telephone number; and consent to the
        jurisdiction of a federal court in your district (or, if outside the US, any
        district in which we may be found).
      </p>

      <h2>Misrepresentation</h2>
      <p>
        Under § 512(f), knowingly submitting a materially false notice or counter-notice
        can make you liable for damages, including costs and legal fees. Please only file
        for material you actually own.
      </p>

      <h2>Related</h2>
      <p>
        See also our <Link href="/privacy-policy">Privacy Policy</Link> and{' '}
        <Link href="/contact">Contact page</Link> for anything that is not a copyright
        matter.
      </p>
    </LegalPage>
  )
}
