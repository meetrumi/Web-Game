import Link from 'next/link'
import LegalPage from '@/components/LegalPage'
import { site } from '@/lib/site'

export const metadata = {
  title: 'Privacy Policy',
  description: `How ${site.name} handles cookies, local storage, advertising partners and your data.`,
  alternates: { canonical: '/privacy-policy' },
  robots: { index: true, follow: true },
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="6 September 2026">
      <p>
        This policy explains what {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects when you visit <strong>{site.url}</strong>, why, and what you can do
        about it. Questions go to{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>

      <h2>1. What we collect</h2>
      <p>
        We do not ask you to create an account and we do not collect names, email
        addresses or payment details unless you email us yourself.
      </p>
      <ul>
        <li>
          <strong>Game progress.</strong> Stored in your browser&rsquo;s local storage on
          your own device. It never reaches our servers, and clearing your browsing data
          deletes it permanently.
        </li>
        <li>
          <strong>Preferences.</strong> Your light/dark mode choice, stored the same way.
        </li>
        <li>
          <strong>Standard server logs.</strong> IP address, user agent, referring page
          and timestamps, automatically collected by our hosting provider for security and
          abuse prevention. Logs are retained for 30 days, then deleted.
        </li>
      </ul>

      <h2>2. Cookies and similar technologies</h2>
      <p>
        We set no advertising cookies of our own. The cookies you may pick up here come
        from our advertising and hosting partners, listed below. You can block or delete
        cookies in your browser settings at any time; the games will still work, and your
        saved progress is unaffected because it is local storage rather than a cookie.
      </p>

      <h2>3. Advertising partners</h2>
      <p>
        This site is funded by advertising. Third-party vendors, including Google, use
        cookies to serve ads based on your prior visits to this and other websites.
      </p>
      <ul>
        <li>
          <strong>Google AdSense.</strong> Google&rsquo;s use of advertising cookies
          enables it and its partners to serve ads based on your visits to this site
          and/or other sites on the internet. You can opt out of personalised advertising
          at{' '}
          <a
            href="https://www.google.com/settings/ads"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google Ads Settings
          </a>
          , and review how Google uses data from partner sites at{' '}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            rel="noopener noreferrer"
            target="_blank"
          >
            policies.google.com/technologies/partner-sites
          </a>
          .
        </li>
        <li>
          <strong>Adsterra.</strong> Serves some of the promotional units and outbound
          offers on this site and sets its own identifiers. See the{' '}
          <a href="https://adsterra.com/privacy-policy/" rel="noopener noreferrer" target="_blank">
            Adsterra privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Game publishers.</strong> Games are embedded from third-party hosts in an
          iframe. Those hosts can set their own cookies and run their own analytics inside
          the frame, under their own policies, which we do not control.
        </li>
      </ul>
      <p>
        To opt out of personalised advertising from many vendors at once, use{' '}
        <a href="https://optout.aboutads.info/" rel="noopener noreferrer" target="_blank">
          optout.aboutads.info
        </a>{' '}
        or{' '}
        <a href="https://www.youronlinechoices.eu/" rel="noopener noreferrer" target="_blank">
          youronlinechoices.eu
        </a>
        .
      </p>

      <h2>4. Sponsored and outbound links</h2>
      <p>
        Some buttons and links on this site — including any labelled
        &ldquo;Sponsored&rdquo; — lead to third-party offers, and we may be paid when you
        follow them or complete an action there. Those links are marked with{' '}
        <code>rel=&quot;sponsored&quot;</code> and open in a new tab. What happens on the
        destination site is governed by that site&rsquo;s own privacy policy, not this one.
      </p>

      <h2>5. Children&rsquo;s privacy</h2>
      <p>
        We do not knowingly collect personal information from children. The site is
        designed for general audiences. If you believe a child has provided us with
        personal information, email{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we will delete
        it promptly.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete or
        port your personal data, to object to processing, and to withdraw consent. In
        California you may also opt out of the &ldquo;sale&rdquo; or
        &ldquo;sharing&rdquo; of personal information for cross-context behavioural
        advertising. Send requests to{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we will respond
        within the period the applicable law requires.
      </p>

      <h2>7. Data retention and security</h2>
      <p>
        We keep server logs for 30 days and nothing else. The site is served over HTTPS.
        No method of transmission or storage is completely secure, and we cannot guarantee
        absolute security.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We will update the date at the top of this page whenever this policy changes.
        Material changes will be noted on the homepage for a reasonable period.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        Copyright matters go through the <Link href="/dmca">DMCA page</Link> instead.
      </p>
    </LegalPage>
  )
}
