'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    const formData = new FormData(e.target)
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: `Topic: ${formData.get('topic')}\n\n${formData.get('message')}`,
      website: formData.get('_gotcha'), // honeypot
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setStatus('success')
        e.target.reset()
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage('Network error. Please check your connection and try again.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
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
          disabled={status === 'submitting'}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
            placeholder:text-ink-400 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
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
          disabled={status === 'submitting'}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
            placeholder:text-ink-400 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
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
          disabled={status === 'submitting'}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
            disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
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
          disabled={status === 'submitting'}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800
            placeholder:text-ink-400 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
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

      {status === 'error' && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {status === 'success' && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Thank you! Your message has been received.
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="btn-primary justify-self-start disabled:opacity-50"
      >
        {status === 'submitting' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  )
}
