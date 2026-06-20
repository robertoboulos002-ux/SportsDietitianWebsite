const express = require('express')
const pool = require('../db/pool')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// GET /api/availability-windows?date=YYYY-MM-DD — list windows set for a date
router.get('/', requireAdmin, async (req, res) => {
  const { date } = req.query

  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Provide a valid date as YYYY-MM-DD.' })
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, date, start_time, end_time FROM availability_windows
       WHERE date = ? ORDER BY start_time ASC`,
      [date]
    )
    const windows = rows.map((r) => ({
      id: r.id,
      date,
      startTime: String(r.start_time).slice(0, 5),
      endTime: String(r.end_time).slice(0, 5)
    }))
    res.json({ date, windows })
  } catch (err) {
    console.error('Failed to fetch availability windows:', err)
    res.status(500).json({ error: 'Could not load availability windows.' })
  }
})

// POST /api/availability-windows — add a window for a date
router.post('/', requireAdmin, async (req, res) => {
  const { date, startTime, endTime } = req.body || {}

  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Provide a valid date as YYYY-MM-DD.' })
  }
  if (!startTime || !TIME_RE.test(startTime) || !endTime || !TIME_RE.test(endTime)) {
    return res.status(400).json({ error: 'Provide valid start and end times as HH:MM.' })
  }
  if (toMinutes(startTime) >= toMinutes(endTime)) {
    return res.status(400).json({ error: 'End time must be after start time.' })
  }

  try {
    // Reject a window that overlaps one already set for this date, so the
    // admin doesn't end up with confusing double-booked windows.
    const [existing] = await pool.execute(
      `SELECT start_time, end_time FROM availability_windows WHERE date = ?`,
      [date]
    )
    const newStart = toMinutes(startTime)
    const newEnd = toMinutes(endTime)
    const overlaps = existing.some((w) => {
      const wStart = toMinutes(String(w.start_time).slice(0, 5))
      const wEnd = toMinutes(String(w.end_time).slice(0, 5))
      return newStart < wEnd && wStart < newEnd
    })
    if (overlaps) {
      return res.status(409).json({ error: 'That overlaps a window you already set for this date.' })
    }

    const [result] = await pool.execute(
      `INSERT INTO availability_windows (date, start_time, end_time) VALUES (?, ?, ?)`,
      [date, startTime, endTime]
    )
    res.status(201).json({ id: result.insertId, date, startTime, endTime })
  } catch (err) {
    console.error('Failed to create availability window:', err)
    res.status(500).json({ error: 'Could not save availability window.' })
  }
})

// POST /api/availability-windows/generate-weekly — stamp a repeating weekly
// pattern onto real dates going forward. Body: { weeksAhead, pattern }, where
// pattern is keyed by day-of-week (0=Sunday...6=Saturday, matching
// Date#getDay()) and each value is an array of { startTime, endTime }.
// Dates that already have ANY windows set are left untouched, so manual
// per-date overrides never get silently clobbered by re-running this.
router.post('/generate-weekly', requireAdmin, async (req, res) => {
  const { weeksAhead, pattern } = req.body || {}

  const weeks = Number(weeksAhead)
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 26) {
    return res.status(400).json({ error: 'Weeks ahead must be a number between 1 and 26.' })
  }
  if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
    return res.status(400).json({ error: 'Provide a weekly pattern.' })
  }

  // Validate everything up front, before writing anything.
  for (const [day, windows] of Object.entries(pattern)) {
    const dayNum = Number(day)
    if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
      return res.status(400).json({ error: 'Invalid day of week in pattern.' })
    }
    if (!Array.isArray(windows)) {
      return res.status(400).json({ error: 'Each day must be a list of windows.' })
    }
    for (const w of windows) {
      if (!w.startTime || !TIME_RE.test(w.startTime) || !w.endTime || !TIME_RE.test(w.endTime)) {
        return res.status(400).json({ error: 'Every window needs a valid start and end time.' })
      }
      if (toMinutes(w.startTime) >= toMinutes(w.endTime)) {
        return res.status(400).json({ error: 'End time must be after start time in every window.' })
      }
    }
    const sorted = [...windows].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        return res.status(400).json({ error: 'Windows on the same day cannot overlap.' })
      }
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = weeks * 7
  const created = []
  const skipped = []

  try {
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const windowsForDay = pattern[date.getDay()]
      if (!windowsForDay || windowsForDay.length === 0) continue

      const dateStr = date.toISOString().split('T')[0]

      const [existing] = await pool.execute(
        `SELECT id FROM availability_windows WHERE date = ? LIMIT 1`,
        [dateStr]
      )
      if (existing.length > 0) {
        skipped.push(dateStr)
        continue
      }

      for (const w of windowsForDay) {
        await pool.execute(
          `INSERT INTO availability_windows (date, start_time, end_time) VALUES (?, ?, ?)`,
          [dateStr, w.startTime, w.endTime]
        )
      }
      created.push(dateStr)
    }

    res.json({ created, skipped })
  } catch (err) {
    console.error('Failed to generate weekly schedule:', err)
    res.status(500).json({ error: 'Could not generate the weekly schedule.' })
  }
})

// DELETE /api/availability-windows/:id — remove a window
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid window id.' })
  }

  try {
    const [result] = await pool.execute(`DELETE FROM availability_windows WHERE id = ?`, [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Window not found.' })
    }
    res.json({ id, deleted: true })
  } catch (err) {
    console.error('Failed to delete availability window:', err)
    res.status(500).json({ error: 'Could not delete availability window.' })
  }
})

module.exports = router
