import { useState } from 'react'

const INSTAGRAM_URL = 'https://www.instagram.com/maranelati'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  async function handleSubscribe(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStatus('success')
      setMessage('You\u2019re on the list.')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Could not subscribe right now.')
    }
  }

  return (
    <footer className="bg-ink text-chalk">
      <div className="tick-rule tick-rule-light" />
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-12 md:grid-cols-3">
        {/* Brand + Instagram */}
        <div>
          <p className="font-display font-extrabold text-lg">Marane Lati</p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/60 mt-1">
            Sports Dietitian . Fitness Trainer
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 text-sm font-display font-semibold uppercase tracking-wide hover:text-ember transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
            </svg>
            @maranelati
          </a>
        </div>

        {/* Newsletter */}
        <div>
          <p className="font-display font-semibold text-sm uppercase tracking-wide">
            Nutrition notes
          </p>
          <p className="text-sm text-chalk/70 mt-2">
            One email a month: training-fuel tips, no spam.
          </p>
          <form onSubmit={handleSubscribe} className="mt-4 flex gap-2" noValidate>
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 min-w-0 bg-chalk/10 border border-chalk/25 px-3 py-2.5 text-sm placeholder:text-chalk/40 focus:bg-chalk/15"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-ember text-ink font-display font-semibold text-sm uppercase px-4 py-2.5 hover:bg-citrus transition-colors disabled:opacity-60"
            >
              {status === 'loading' ? '...' : 'Join'}
            </button>
          </form>
          {message && (
            <p
              role="status"
              className={`mt-2 text-xs font-mono ${status === 'error' ? 'text-ember' : 'text-citrus'}`}
            >
              {message}
            </p>
          )}
        </div>

        {/* Contact */}
        <div>
          <p className="font-display font-semibold text-sm uppercase tracking-wide">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-chalk/80 font-mono">
            <li><a href="mailto:marane.lati@gmail.com" className="hover:text-ember">marane.lati@gmail.com</a></li>
            <li><a href="tel:+96171268098" className="hover:text-ember">+961 71 268 098</a></li>
            <li>Koura, Lebanon · in-person &amp; online</li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-8 text-xs text-chalk/50 font-mono">
        © {new Date().getFullYear()} Marane Lati. All rights reserved.
      </div>
    </footer>
  )
}
