import { useEffect, useMemo, useState } from 'react'
import TickDivider from '../components/TickDivider.jsx'

const ADMIN_PASSWORD_KEY = 'sportDietitianAdminPassword'
const STATUSES = ['pending', 'confirmed', 'cancelled']
const TYPE_LABELS = {
  consultation: 'Nutrition Consultation',
  'body-composition': 'Body Composition Test'
}
const TYPE_PRICES = {
  consultation: '$120',
  'body-composition': '$75'
}

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(ADMIN_PASSWORD_KEY) || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadState, setLoadState] = useState('idle')
  const [message, setMessage] = useState('')

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings
    return bookings.filter((booking) => booking.status === statusFilter)
  }, [bookings, statusFilter])

  useEffect(() => {
    if (password) loadBookings(password)
  }, [password])

  async function loadBookings(adminPassword = password) {
    setLoadState('loading')
    setMessage('')

    try {
      const res = await fetch('/api/bookings', {
        headers: { 'x-admin-password': adminPassword }
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Could not load bookings.')

      setBookings(data)
      setLoadState('ready')
    } catch (err) {
      setLoadState('error')
      setMessage(err.message || 'Could not load bookings.')
      if (err.message?.toLowerCase().includes('password')) {
        sessionStorage.removeItem(ADMIN_PASSWORD_KEY)
        setPassword('')
      }
    }
  }

  function handleLogin(e) {
    e.preventDefault()
    const nextPassword = passwordInput.trim()
    if (!nextPassword) return

    sessionStorage.setItem(ADMIN_PASSWORD_KEY, nextPassword)
    setPassword(nextPassword)
    setPasswordInput('')
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY)
    setPassword('')
    setBookings([])
    setMessage('')
    setLoadState('idle')
  }

  async function updateStatus(id, status) {
    setMessage('')

    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ status })
      })
      const updated = await res.json()

      if (!res.ok) throw new Error(updated.error || 'Could not update booking.')

      setBookings((items) => {
        if (statusFilter === 'all' || statusFilter === updated.status) {
          return items.map((item) => (item.id === id ? updated : item))
        }

        return items.filter((item) => item.id !== id)
      })
    } catch (err) {
      setMessage(err.message || 'Could not update booking.')
    }
  }

  if (!password) {
    return (
      <section className="max-w-md mx-auto px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss">Admin</p>
        <h1 className="font-display font-extrabold text-3xl mt-3">Booking dashboard</h1>
        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <label className="block">
            <span className="font-display font-semibold text-sm uppercase tracking-wide">Password</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="mt-2 w-full border border-ink/20 bg-chalk px-3.5 py-2.5 text-sm focus:bg-white"
              autoComplete="current-password"
            />
          </label>
          {message && <p role="alert" className="font-mono text-xs text-ember">{message}</p>}
          <button className="font-display font-semibold uppercase text-sm tracking-wide bg-ink text-chalk px-6 py-3 hover:bg-ember transition-colors">
            Open dashboard
          </button>
        </form>
      </section>
    )
  }

  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss">Admin</p>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl mt-3">Booking dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => loadBookings()}
              className="font-display font-semibold uppercase text-xs tracking-wide border border-ink px-4 py-2.5 hover:border-ember hover:text-ember transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="font-display font-semibold uppercase text-xs tracking-wide bg-ink text-chalk px-4 py-2.5 hover:bg-ember transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </section>

      <TickDivider className="max-w-6xl mx-auto" />

      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-2">
          {['all', ...STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`font-display font-semibold uppercase text-xs tracking-wide border px-4 py-2 transition-colors ${
                statusFilter === status
                  ? 'border-ember bg-ember/5 text-ember'
                  : 'border-ink/20 hover:border-ink/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {message && <p role="alert" className="mt-5 font-mono text-xs text-ember">{message}</p>}
        {loadState === 'loading' && <p className="mt-8 font-mono text-sm text-steel">Loading bookings...</p>}
        {loadState === 'error' && <p className="mt-8 font-mono text-sm text-ember">{message}</p>}

        {loadState === 'ready' && filteredBookings.length === 0 && (
          <p className="mt-8 font-mono text-sm text-steel">No bookings found.</p>
        )}

        {loadState === 'ready' && filteredBookings.length > 0 && (
          <div className="mt-7 overflow-x-auto border border-ink/10">
            <table className="min-w-full text-sm">
              <thead className="bg-moss/5 text-left font-display uppercase tracking-wide text-xs">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const actions = booking.status === 'pending' ? ['confirmed', 'cancelled'] : []

                  return (
                    <tr key={booking.id} className="border-t border-ink/10 align-top">
                      <td className="px-4 py-4">
                        <p className="font-display font-semibold">{booking.name}</p>
                        <a className="block text-steel hover:text-ember" href={`mailto:${booking.email}`}>{booking.email}</a>
                        <a className="block text-steel hover:text-ember" href={`tel:${booking.phone}`}>{booking.phone}</a>
                        {booking.notes && <p className="mt-2 max-w-xs text-xs text-steel leading-relaxed">{booking.notes}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <p>{TYPE_LABELS[booking.appointment_type] || booking.appointment_type}</p>
                        <p className="mt-1 font-mono text-xs text-ember">{TYPE_PRICES[booking.appointment_type]}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        <p>{formatDate(booking.preferred_date)}</p>
                        <p className="mt-1 text-steel">{formatTime(booking.preferred_time)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-mono text-xs uppercase ${statusClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {actions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {actions.map((status) => (
                              <button
                                key={status}
                                onClick={() => updateStatus(booking.id, status)}
                                className="font-display font-semibold uppercase text-[11px] tracking-wide border border-ink/20 px-3 py-2 hover:border-ember hover:text-ember"
                              >
                                {status === 'confirmed' ? 'Confirm' : 'Cancel'}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-steel">No action needed</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function formatDate(value) {
  if (!value) return ''
  const dateText = String(value).slice(0, 10)
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${dateText}T00:00:00`))
}

function formatTime(value) {
  return String(value || '').slice(0, 5)
}

function statusClass(status) {
  if (status === 'confirmed') return 'text-moss'
  if (status === 'cancelled') return 'text-steel'
  return 'text-ember'
}
