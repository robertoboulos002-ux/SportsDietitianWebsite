const express = require('express')
const pool = require('../db/pool')

const router = express.Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/availability?date=YYYY-MM-DD
// Returns the times already booked (and still active) on that date, so the
// frontend can hide them instead of letting someone pick a taken slot.
router.get('/', async (req, res) => {
  const { date } = req.query

  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Provide a valid date as YYYY-MM-DD.' })
  }

  try {
    const [rows] = await pool.execute(
      `SELECT preferred_time FROM bookings
       WHERE preferred_date = ? AND status != 'cancelled'`,
      [date]
    )
    const bookedTimes = rows.map((r) => r.preferred_time.slice(0, 5)) // "09:00:00" -> "09:00"
    res.json({ date, bookedTimes })
  } catch (err) {
    console.error('Failed to fetch availability:', err)
    res.status(500).json({ error: 'Could not load availability.' })
  }
})

module.exports = router
