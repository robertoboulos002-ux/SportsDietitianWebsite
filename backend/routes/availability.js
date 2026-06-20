const express = require('express')
const pool = require('../db/pool')
const { getAvailableSlots, APPOINTMENT_DURATIONS_MIN } = require('../utils/scheduling')

const router = express.Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/availability?date=YYYY-MM-DD&type=consultation|body-composition
// Returns the start times still open on that date for the requested
// appointment type — built from the admin's configured availability
// windows for that date (see availability_windows table), minus anything
// that would overlap an existing booking's actual duration.
router.get('/', async (req, res) => {
  const { date, type } = req.query

  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Provide a valid date as YYYY-MM-DD.' })
  }
  if (!APPOINTMENT_DURATIONS_MIN[type]) {
    return res.status(400).json({ error: 'Provide a valid appointment type.' })
  }

  try {
    const [windowRows] = await pool.execute(
      `SELECT start_time, end_time FROM availability_windows
       WHERE date = ? ORDER BY start_time ASC`,
      [date]
    )
    const windows = windowRows.map((w) => ({
      startTime: String(w.start_time).slice(0, 5),
      endTime: String(w.end_time).slice(0, 5)
    }))

    const [bookingRows] = await pool.execute(
      `SELECT preferred_time, appointment_type FROM bookings
       WHERE preferred_date = ? AND status != 'cancelled'`,
      [date]
    )
    const existingBookings = bookingRows.map((r) => ({
      preferredTime: String(r.preferred_time).slice(0, 5),
      appointmentType: r.appointment_type
    }))

    const availableTimes = getAvailableSlots(type, existingBookings, windows)
    res.json({ date, type, availableTimes })
  } catch (err) {
    console.error('Failed to fetch availability:', err)
    res.status(500).json({ error: 'Could not load availability.' })
  }
})

module.exports = router
