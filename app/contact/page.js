import Link from 'next/link'
import LegalPage from '@/components/LegalPage'
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
      {/* ====================================================================
        * >>> PLUG IN: FORM BACKEND <<<
        *
        * This form currently uses a mailto: action, which works everywhere but
        * opens the visitor's mail client rather than posting anywhere. Swap the
        * action for a real endpoint when you have one — Formspree, Web3Forms and
        * a Next.js route handler at app/api/contact/route.js are all fine.
        *
        * If you add a route handler, add rate limiting and a spam check (honeypot
        * or Turnstile) before you ship it. A public unauthenticated POST endpoint
        * that sends email will be found and abused within days.
        * ==================================================================== */}
      <form
        action={`mailto:${site.contactEmail}`}
        method="post"
        encType="text/plain"
        className="not-prose grid gap-4 rounded-2xl border border-ink-200 p-5 dark:border-ink-800"
      >
        <div className="grid gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
              placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            placeholder="Alex"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
              placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="topic" className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            Topic
          </label>
          <select
            id="topic"
            name="topic"
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
              dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
          >
            <option>Broken game</option>
            <option>Suggest a game</option>
            <option>Advertising / partnership</option>
            <option>Something else</option>
          </select>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="message" className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
              placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            placeholder="What's up?"
          />
        </div>

        {/* Honeypot: bots fill hidden fields, humans never see this one. */}
        <input
          type="text"
          name="_gotcha"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <button type="submit" className="btn-primary justify-self-start">
          Send message
        </button>
      </form>
    </LegalPage>
  )
}
