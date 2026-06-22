import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import TickDivider from '../components/TickDivider.jsx'

const ADMIN_PASSWORD_KEY = 'sportDietitianAdminPassword'
const GENERATED_SCHEDULE_KEY = 'sportDietitianLastGeneratedSchedule'
const STATUSES = ['pending', 'confirmed', 'cancelled']
const TYPE_LABELS = {
  consultation: 'Nutrition Consultation',
  'body-composition': 'Body Composition Test'
}
const TYPE_PRICES = {
  consultation: '$120',
  'body-composition': '$75'
}
// Date#getDay() convention: 0=Sunday...6=Saturday. Displayed Monday-first.
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const emptyPattern = () => Object.fromEntries(DAY_ORDER.map((d) => [d, []]))
const emptyDrafts = () => Object.fromEntries(DAY_ORDER.map((d) => [d, { start: '', end: '' }]))

// Reads the last-generated schedule snapshot from this browser's local
// storage, if any — this is what makes the confirmation table below survive
// navigating away from /admin, refreshing, and even fully closing the
// browser, without needing a database round-trip.
function loadSavedSchedule() {
  try {
    const raw = localStorage.getItem(GENERATED_SCHEDULE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(ADMIN_PASSWORD_KEY) || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadState, setLoadState] = useState('idle')
  const [message, setMessage] = useState('')

  const [weeklyPattern, setWeeklyPattern] = useState(emptyPattern)
  const [dayDraft, setDayDraft] = useState(emptyDrafts)
  const [weeksAhead, setWeeksAhead] = useState(8)
  const [generateState, setGenerateState] = useState(() => (loadSavedSchedule() ? 'done' : 'idle'))
  const [generateMessage, setGenerateMessage] = useState('')
  const [generateResult, setGenerateResult] = useState(() => loadSavedSchedule()?.result ?? null)
  const [lastGeneratedPattern, setLastGeneratedPattern] = useState(
    () => loadSavedSchedule()?.pattern ?? emptyPattern()
  )

  const filteredBookings = useMemo(() => {
    let result = statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter)

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((b) =>
        b.name?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.phone?.toLowerCase().includes(q)
      )
    }

    return result
  }, [bookings, statusFilter, searchQuery])

  useEffect(() => {
    if (password) loadBookings(password)
  }, [password])

  function addPatternWindow(day) {
    const { start, end } = dayDraft[day]
    if (!start || !end) return
    if (start >= end) {
      setGenerateMessage('End time must be after start time.')
      return
    }

    setWeeklyPattern((p) => ({
      ...p,
      [day]: [...p[day], { startTime: start, endTime: end }].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      )
    }))
    setDayDraft((d) => ({ ...d, [day]: { start: '', end: '' } }))
    setGenerateMessage('')
  }

  function removePatternWindow(day, index) {
    setWeeklyPattern((p) => ({ ...p, [day]: p[day].filter((_, i) => i !== index) }))
  }

  async function generateWeeklySchedule(e) {
    e.preventDefault()
    setGenerateMessage('')
    setGenerateResult(null)

    const hasAnyWindows = Object.values(weeklyPattern).some((w) => w.length > 0)
    if (!hasAnyWindows) {
      setGenerateState('error')
      setGenerateMessage('Add at least one window to at least one day first.')
      return
    }

    setGenerateState('loading')

    try {
      const res = await fetch('/api/availability-windows/generate-weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ weeksAhead: Number(weeksAhead), pattern: weeklyPattern })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Could not generate the schedule.')

      setGenerateState('done')
      setGenerateResult(data)
      setLastGeneratedPattern(weeklyPattern)
      try {
        localStorage.setItem(
          GENERATED_SCHEDULE_KEY,
          JSON.stringify({ pattern: weeklyPattern, result: data })
        )
      } catch {
        // Local storage can fail in private-browsing edge cases — the
        // schedule still generated successfully either way, so this is
        // non-fatal; it just won't survive closing the browser this time.
      }
    } catch (err) {
      setGenerateState('error')
      setGenerateMessage(err.message || 'Could not generate the schedule.')
    }
  }

  function exportToExcel() {
    const rows = filteredBookings.map((b) => ({
      'Name':             b.name,
      'Email':            b.email,
      'Phone':            b.phone,
      'Session':          TYPE_LABELS[b.appointment_type] || b.appointment_type,
      'Price':            TYPE_PRICES[b.appointment_type] || '',
      'Date':             formatDate(b.preferred_date),
      'Time':             formatTime(b.preferred_time),
      'Status':           b.status,
      'Notes':            b.notes || '',
      'Booked at':        b.created_at ? new Date(b.created_at).toLocaleString() : ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings')

    // Auto-size columns based on content
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] || '').length)) + 2
    }))
    worksheet['!cols'] = colWidths

    const filename = `bookings-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

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
        <h2 className="font-display font-bold text-xl">Weekly schedule</h2>
        <p className="text-steel text-sm mt-1 max-w-xl">
          Build a repeating weekly pattern, then stamp it onto upcoming dates in one
          go. Re-running this skips any date that already has hours set, so it's
          safe to use again whenever your pattern changes.
        </p>

        <div className="mt-6 space-y-4">
          {DAY_ORDER.map((day) => (
            <div key={day} className="flex flex-wrap items-center gap-3 border-b border-ink/10 pb-4">
              <span className="font-display font-semibold text-sm w-24 shrink-0">
                {DAY_LABELS[day]}
              </span>

              <div className="flex flex-wrap gap-2">
                {weeklyPattern[day].map((w, i) => (
                  <span
                    key={`${w.startTime}-${w.endTime}-${i}`}
                    className="flex items-center gap-2 border border-ink/15 px-2.5 py-1.5 font-mono text-xs"
                  >
                    {w.startTime} – {w.endTime}
                    <button
                      type="button"
                      onClick={() => removePatternWindow(day, i)}
                      aria-label={`Remove ${w.startTime} to ${w.endTime} on ${DAY_LABELS[day]}`}
                      className="text-steel hover:text-ember text-sm leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 md:ml-auto">
                <input
                  type="time"
                  value={dayDraft[day].start}
                  onChange={(e) =>
                    setDayDraft((d) => ({ ...d, [day]: { ...d[day], start: e.target.value } }))
                  }
                  className="border border-ink/20 bg-chalk px-2 py-1.5 text-xs focus:bg-white"
                />
                <span className="text-steel text-xs">to</span>
                <input
                  type="time"
                  value={dayDraft[day].end}
                  onChange={(e) =>
                    setDayDraft((d) => ({ ...d, [day]: { ...d[day], end: e.target.value } }))
                  }
                  className="border border-ink/20 bg-chalk px-2 py-1.5 text-xs focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => addPatternWindow(day)}
                  className="font-display font-semibold uppercase text-[11px] tracking-wide border border-ink/20 px-3 py-1.5 hover:border-ember hover:text-ember"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={generateWeeklySchedule} className="mt-6 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-steel">Apply for the next</span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min="1"
                max="26"
                value={weeksAhead}
                onChange={(e) => setWeeksAhead(e.target.value)}
                className="w-20 border border-ink/20 bg-chalk px-2 py-2 text-sm focus:bg-white"
              />
              <span className="text-sm text-steel">weeks</span>
            </div>
          </label>
          <button
            type="submit"
            disabled={generateState === 'loading'}
            className="font-display font-semibold uppercase text-sm tracking-wide bg-ink text-chalk px-6 py-3 hover:bg-ember transition-colors disabled:opacity-60"
          >
            {generateState === 'loading' ? 'Generating…' : 'Generate schedule'}
          </button>
        </form>

        {generateMessage && (
          <p role="alert" className="mt-4 font-mono text-xs text-ember">{generateMessage}</p>
        )}
        {generateState === 'done' && generateResult && (
          <div className="mt-6">
            <p className="font-mono text-xs text-moss">
              Applied to {generateResult.created.length} date{generateResult.created.length === 1 ? '' : 's'}
              {generateResult.skipped.length > 0
                ? `, skipped ${generateResult.skipped.length} that already had hours set`
                : ''}.
            </p>

            <div className="mt-4 overflow-x-auto border border-ink/10">
              <table className="min-w-full text-sm">
                <thead className="bg-moss/5 text-left font-display uppercase tracking-wide text-xs">
                  <tr>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {DAY_ORDER.filter((day) => lastGeneratedPattern[day]?.length > 0).map((day) => (
                    <tr key={day} className="border-t border-ink/10">
                      <td className="px-4 py-3 font-display font-semibold">{DAY_LABELS[day]}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {lastGeneratedPattern[day].map((w) => `${w.startTime}–${w.endTime}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <TickDivider className="max-w-6xl mx-auto" />

      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3">
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

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or phone…"
            aria-label="Search bookings"
            className="w-full md:w-64 md:ml-auto border border-ink/20 bg-chalk px-3.5 py-2 text-sm focus:bg-white"
          />

          {filteredBookings.length > 0 && (
            <button
              onClick={exportToExcel}
              className="font-display font-semibold uppercase text-xs tracking-wide border border-ink/20 px-4 py-2 hover:border-moss hover:text-moss transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Excel
            </button>
          )}
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
