import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import TickDivider from '../components/TickDivider.jsx'

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Nutrition Consultation', duration: '50 min', price: '$120' },
  { value: 'body-composition', label: 'Body Composition Test', duration: '30 min', price: '$75' }
]

const ALL_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
]

const todayISO = new Date().toISOString().split('T')[0]

export default function Booking() {
  const [searchParams] = useSearchParams()
  const presetType = searchParams.get('type')
  const initialType = APPOINTMENT_TYPES.some((t) => t.value === presetType)
    ? presetType
    : APPOINTMENT_TYPES[0].value

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    appointmentType: initialType,
    preferredDate: '',
    preferredTime: '',
    notes: ''
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [serverMessage, setServerMessage] = useState('')

  const [bookedTimes, setBookedTimes] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const availableSlots = ALL_TIME_SLOTS.filter((t) => !bookedTimes.includes(t))

  // Whenever the chosen date changes, ask the backend which times are
  // already taken on that date so we can hide them instead of letting
  // someone pick a slot that's already gone.
  useEffect(() => {
    if (!form.preferredDate) {
      setBookedTimes([])
      return
    }

    let cancelled = false
    setSlotsLoading(true)

    fetch(`/api/availability?date=${form.preferredDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setBookedTimes(data.bookedTimes || [])
        // If the previously selected time just became unavailable, clear it.
        setForm((f) =>
          data.bookedTimes?.includes(f.preferredTime) ? { ...f, preferredTime: '' } : f
        )
      })
      .catch(() => {
        if (!cancelled) setBookedTimes([])
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })

    return () => { cancelled = true }
  }, [form.preferredDate])

  function update(field, value) {
    const nextValue = field === 'phone' ? value.replace(/\D/g, '') : value
    setForm((f) => ({ ...f, [field]: nextValue }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email.'
    if (!form.phone.trim()) next.phone = 'Enter a phone number.'
    else if (!/^\d+$/.test(form.phone)) next.phone = 'Use numbers only.'
    if (!form.preferredDate) next.preferredDate = 'Pick a date.'
    else if (form.preferredDate < todayISO) next.preferredDate = 'Pick a date in the future.'
    if (!form.preferredTime) next.preferredTime = 'Pick an available time.'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validation = validate()
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    setStatus('loading')
    setServerMessage('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (res.status === 409) {
        // Someone else took the slot between page load and submit — refresh
        // the available times so the dropdown reflects reality.
        setBookedTimes((prev) => [...prev, form.preferredTime])
        setForm((f) => ({ ...f, preferredTime: '' }))
        throw new Error(data.error || 'That slot was just taken. Please pick another time.')
      }
      if (!res.ok) throw new Error(data.error || 'Could not submit booking.')

      setStatus('success')
      setForm({
        name: '',
        email: '',
        phone: '',
        appointmentType: APPOINTMENT_TYPES[0].value,
        preferredDate: '',
        preferredTime: '',
        notes: ''
      })
    } catch (err) {
      setStatus('error')
      setServerMessage(err.message || 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss">Request received</p>
        <h1 className="font-display font-bold text-3xl mt-4">Booking submitted</h1>
        <p className="text-steel mt-4 leading-relaxed">
          Thanks — your request has been logged. You'll get a confirmation email
          shortly to lock in your exact time slot.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="inline-block mt-8 font-display font-semibold uppercase text-sm tracking-wide border border-ink px-6 py-3.5 hover:border-ember hover:text-ember transition-colors"
        >
          Book another session
        </button>
      </section>
    )
  }

  return (
    <div>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 md:pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss">Booking</p>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl mt-3">
          Book your session
        </h1>
        <p className="text-steel mt-4">
          Submit a request below — I'll confirm your exact slot by email within 24 hours.
        </p>
      </section>

      <TickDivider className="max-w-3xl mx-auto" />

      <section className="max-w-3xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          {/* Appointment type */}
          <fieldset>
            <legend className="font-display font-semibold text-sm uppercase tracking-wide">
              Appointment type
            </legend>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {APPOINTMENT_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`block border px-4 py-3.5 cursor-pointer text-sm transition-colors ${
                    form.appointmentType === t.value
                      ? 'border-ember bg-ember/5'
                      : 'border-ink/15 hover:border-ink/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="appointmentType"
                    value={t.value}
                    checked={form.appointmentType === t.value}
                    onChange={(e) => update('appointmentType', e.target.value)}
                    className="sr-only"
                  />
                  <span className="block font-display font-semibold">{t.label}</span>
                  <span className="mt-1 block font-mono text-xs uppercase tracking-wide text-steel">
                    {t.duration} / {t.price}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Name / Email */}
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Full name" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={inputClass(errors.name)}
                autoComplete="name"
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputClass(errors.email)}
                autoComplete="email"
              />
            </Field>
          </div>

          {/* Phone */}
          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={inputClass(errors.phone)}
              autoComplete="tel"
            />
          </Field>

          {/* Date / Time */}
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Preferred date" error={errors.preferredDate}>
              <input
                type="date"
                min={todayISO}
                value={form.preferredDate}
                onChange={(e) => update('preferredDate', e.target.value)}
                className={inputClass(errors.preferredDate)}
              />
            </Field>
            <Field label="Preferred time" error={errors.preferredTime}>
              <select
                value={form.preferredTime}
                onChange={(e) => update('preferredTime', e.target.value)}
                className={inputClass(errors.preferredTime)}
                disabled={!form.preferredDate || slotsLoading || availableSlots.length === 0}
              >
                {!form.preferredDate && <option value="">Pick a date first</option>}
                {form.preferredDate && slotsLoading && <option value="">Checking availability…</option>}
                {form.preferredDate && !slotsLoading && availableSlots.length === 0 && (
                  <option value="">Fully booked — try another date</option>
                )}
                {form.preferredDate && !slotsLoading && availableSlots.length > 0 && (
                  <>
                    <option value="">Select a time</option>
                    {availableSlots.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </>
                )}
              </select>
            </Field>
          </div>

          {/* Notes */}
          <Field label="Anything I should know? (optional)">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Current training load, goals, injuries, dietary restrictions…"
              className={inputClass()}
            />
          </Field>

          {status === 'error' && (
            <p role="alert" className="text-sm font-mono text-ember">{serverMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-display font-semibold uppercase text-sm tracking-wide bg-ink text-chalk px-7 py-3.5 hover:bg-ember transition-colors disabled:opacity-60"
          >
            {status === 'loading' ? 'Submitting…' : 'Request this slot'}
          </button>
        </form>
      </section>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="font-display font-semibold text-sm uppercase tracking-wide">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <span className="block mt-1.5 text-xs font-mono text-ember">{error}</span>}
    </label>
  )
}

function inputClass(error) {
  return `w-full border px-3.5 py-2.5 text-sm bg-chalk focus:bg-white transition-colors ${
    error ? 'border-ember' : 'border-ink/20'
  }`
}
