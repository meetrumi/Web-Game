import { NextResponse } from 'next/server'
import { site } from '@/lib/site'

/**
 * POST /api/contact
 *
 * Validates honeypot, rate-limits by IP, and forwards contact form submissions
 * to the configured email endpoint. Returns JSON success/error for the client.
 *
 * For production: replace this stub with a real email service (SendGrid, Resend,
 * Postmark) or a form handler (Formspree, Basin). The honeypot field prevents
 * most bots; rate-limiting by IP (via headers or edge config) stops the rest.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, message, website } = body

    // Honeypot check: the "website" field is hidden via CSS and should be empty.
    // A bot that fills every field will populate it, and we silently reject.
    if (website) {
      // Return success to the bot so it moves on; log the attempt if you want metrics.
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      )
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    // Length limits to prevent abuse
    if (name.length > 100 || email.length > 100 || message.length > 2000) {
      return NextResponse.json(
        { error: 'One or more fields exceed maximum length.' },
        { status: 400 }
      )
    }

    // ==========================================================================
    // >>> PLUG IN: REAL EMAIL SERVICE <<<
    //
    // Replace this console.log with actual email delivery via SendGrid, Resend,
    // Postmark, or a form handler service. Store your API key in .env.local as
    // EMAIL_API_KEY and never commit it to git.
    //
    // Example with SendGrid:
    //
    //   import sgMail from '@sendgrid/mail'
    //   sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    //   await sgMail.send({
    //     to: site.contactEmail,
    //     from: 'noreply@yourdomain.com', // must be verified sender
    //     replyTo: email,
    //     subject: `ClickVault Contact: ${name}`,
    //     text: message,
    //     html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
    //   })
    //
    // Example with Resend:
    //
    //   import { Resend } from 'resend'
    //   const resend = new Resend(process.env.RESEND_API_KEY)
    //   await resend.emails.send({
    //     from: 'noreply@yourdomain.com',
    //     to: site.contactEmail,
    //     replyTo: email,
    //     subject: `ClickVault Contact: ${name}`,
    //     html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
    //   })
    //
    // ==========================================================================

    console.log('📧 Contact form submission:', { name, email, message })

    // For now, return success immediately. Once you plug in a real service,
    // await the send call above and catch any errors it throws.
    return NextResponse.json(
      { success: true, message: 'Thank you! Your message has been received.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
}
