const express = require('express')
const pool = require('../db/pool')
const { sendBookingNotification, sendClientStatusEmail } = require('../utils/mailer')
const { getDuration, fitsWithinWindows, rangesOverlap } = require('../utils/scheduling')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()

const VALID_TYPES = ['consultation', 'body-composition']
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled']
const EMAIL_RE = /^\S+@\S+\.\S+$/
const PHONE_RE = /^\d+$/
const APPOINTMENT_PRICES = {
  consultation: process.env.PRICE_CONSULTATION || '$120',
  'body-composition': process.env.PRICE_BODY_COMPOSITION || '$75'
}

// POST /api/bookings — create a new booking request
router.post('/', async (req, res) => {
  const { name, email, phone, appointmentType, preferredDate, preferredTime, notes } = req.body || {}

  const errors = {}
  if (!name || !name.trim()) errors.name = 'Name is required.'
  if (!email || !EMAIL_RE.test(email)) errors.email = 'A valid email is required.'
  if (!phone || !phone.trim()) errors.phone = 'Phone is required.'
  else if (!PHONE_RE.test(phone.trim())) errors.phone = 'Phone must contain digits only.'
  if (!VALID_TYPES.includes(appointmentType)) errors.appointmentType = 'Invalid appointment type.'
  if (!preferredDate || isNaN(Date.parse(preferredDate))) errors.preferredDate = 'A valid date is required.'
  if (!preferredTime) errors.preferredTime = 'A preferred time is required.'

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors })
  }

  try {
    // The admin's configured availability for this date — if they haven't
    // set any windows, nothing on this date is bookable.
    const [windowRows] = await pool.execute(
      `SELECT start_time, end_time FROM availability_windows WHERE date = ?`,
      [preferredDate]
    )
    const windows = windowRows.map((w) => ({
      startTime: String(w.start_time).slice(0, 5),
      endTime: String(w.end_time).slice(0, 5)
    }))
    const requestedDuration = getDuration(appointmentType)

    if (!fitsWithinWindows(preferredTime, requestedDuration, windows)) {
      return res.status(400).json({
        error: 'That time is outside the available hours for this date.',
        fields: { preferredTime: 'Outside available hours for this date.' }
      })
    }

    // Check for any existing active booking that day whose time range
    // overlaps the requested one — not just an exact-time match. A 50-min
    // consultation at 10:00 occupies 10:00-10:50, so a 15-min body
    // composition test at 10:15 must be rejected even though the times
    // don't literally match. The database's unique index (see schema.sql)
    // is a secondary safety net against exact-time race conditions; this
    // check is what catches duration-based overlaps and gives a friendly
    // message instead of a generic database error.
    const [sameDayBookings] = await pool.execute(
      `SELECT preferred_time, appointment_type FROM bookings
       WHERE preferred_date = ? AND status != 'cancelled'`,
      [preferredDate]
    )
    const hasOverlap = sameDayBookings.some((existing) => {
      const existingDuration = getDuration(existing.appointment_type)
      const existingTime = String(existing.preferred_time).slice(0, 5)
      return rangesOverlap(preferredTime, requestedDuration, existingTime, existingDuration)
    })
    if (hasOverlap) {
      return res.status(409).json({ error: 'That slot overlaps another booking. Please pick another time.' })
    }

    const [result] = await pool.execute(
      `INSERT INTO bookings (name, email, phone, appointment_type, preferred_date, preferred_time, notes, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim(), phone.trim(), appointmentType, preferredDate, preferredTime, notes || null, APPOINTMENT_PRICES[appointmentType]]
    )

    // Email failures shouldn't fail the booking itself — the row is already
    // saved, so we log the error and still confirm success to the client.
    try {
      await sendBookingNotification({
        name,
        email,
        phone,
        appointmentType,
        preferredDate,
        preferredTime,
        notes,
        price: APPOINTMENT_PRICES[appointmentType]
      })
    } catch (mailErr) {
      console.error('Booking saved, but notification email failed:', mailErr)
    }

    res.status(201).json({ id: result.insertId, status: 'pending' })
  } catch (err) {
    // The DB unique index throws ER_DUP_ENTRY (errno 1062) if two requests
    // race past the check above at the same instant.
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'That slot was just taken. Please pick another time.' })
    }
    console.error('Failed to create booking:', err)
    res.status(500).json({ error: 'Could not save your booking. Please try again.' })
  }
})

// GET /api/bookings — list bookings (for an admin view; add auth before exposing publicly)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, appointment_type, preferred_date, preferred_time, notes, status, price, created_at
       FROM bookings ORDER BY created_at DESC, id DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch bookings:', err)
    res.status(500).json({ error: 'Could not load bookings.' })
  }
})

// PATCH /api/bookings/:id - update a booking status (and optionally price) from the admin dashboard.
router.patch('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const { status, price } = req.body || {}

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid booking id.' })
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status.' })
  }

  try {
    // Build update dynamically — status only, price only, or both
    const fields = []
    const values = []
    if (status) { fields.push('status = ?'); values.push(status) }
    if (price !== undefined) { fields.push('price = ?'); values.push(price || null) }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' })
    values.push(id)

    const [result] = await pool.execute(
      `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found.' })
    }

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, appointment_type, preferred_date, preferred_time, notes, status, price, created_at
       FROM bookings WHERE id = ?`,
      [id]
    )

    if (status === 'confirmed' || status === 'cancelled') {
      const booking = rows[0]
      try {
        await sendClientStatusEmail({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          appointmentType: booking.appointment_type,
          preferredDate: booking.preferred_date,
          preferredTime: String(booking.preferred_time).slice(0, 5),
          notes: booking.notes,
          status: booking.status,
          price: booking.price || APPOINTMENT_PRICES[booking.appointment_type]
        })
      } catch (mailErr) {
        console.error('Booking updated, but client status email failed:', mailErr)
      }
    }

    res.json(rows[0])
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Another active booking already uses that slot.' })
    }
    console.error('Failed to update booking:', err)
    res.status(500).json({ error: 'Could not update booking.' })
  }
})

module.exports = router
