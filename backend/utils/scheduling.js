// Single source of truth for appointment durations and overlap math.
// Business hours are no longer fixed in code — they come from the admin's
// per-date availability windows (see availability_windows table), set from
// the admin dashboard's "Preferred time" section.

const APPOINTMENT_DURATIONS_MIN = {
  consultation: 50,
  'body-composition': 15
}

const SLOT_STEP_MIN = 15

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0')
  const m = String(mins % 60).padStart(2, '0')
  return `${h}:${m}`
}

function getDuration(appointmentType) {
  return APPOINTMENT_DURATIONS_MIN[appointmentType] || null
}

// Does `durationMin` minutes starting at `start` fit entirely inside one of
// the given windows (each { startTime, endTime })? A 50-min consultation at
// 11:30 does NOT fit a window that ends at 12:00.
function fitsWithinWindows(start, durationMin, windows) {
  const startMin = timeToMinutes(start)
  const endMin = startMin + durationMin
  return windows.some(
    (w) => startMin >= timeToMinutes(w.startTime) && endMin <= timeToMinutes(w.endTime)
  )
}

// Do two [start, start+duration) ranges actually overlap? Touching
// boundaries (one ends exactly when the other starts) do NOT count as
// an overlap — that's what lets a 11:00-11:15 booking be followed
// immediately by an 11:15 booking.
function rangesOverlap(startA, durationA, startB, durationB) {
  const aStart = timeToMinutes(startA)
  const aEnd = aStart + durationA
  const bStart = timeToMinutes(startB)
  const bEnd = bStart + durationB
  return aStart < bEnd && bStart < aEnd
}

// All 15-minute candidate start times across the given windows.
function generateCandidateStarts(windows) {
  const candidates = []
  for (const w of windows) {
    for (let m = timeToMinutes(w.startTime); m < timeToMinutes(w.endTime); m += SLOT_STEP_MIN) {
      candidates.push(minutesToTime(m))
    }
  }
  return candidates
}

// Given the appointment type being requested, the day's existing active
// bookings, and the admin's configured windows for that date, return the
// start times that fit a window and don't overlap anything already booked.
// If the admin hasn't set any windows for this date, nothing is bookable.
function getAvailableSlots(appointmentType, existingBookings, windows) {
  const duration = getDuration(appointmentType)
  if (!duration || !windows || windows.length === 0) return []

  return generateCandidateStarts(windows).filter((candidate) => {
    if (!fitsWithinWindows(candidate, duration, windows)) return false

    return !existingBookings.some((existing) => {
      const existingDuration = getDuration(existing.appointmentType)
      if (!existingDuration) return false
      return rangesOverlap(candidate, duration, existing.preferredTime, existingDuration)
    })
  })
}

module.exports = {
  APPOINTMENT_DURATIONS_MIN,
  getDuration,
  fitsWithinWindows,
  rangesOverlap,
  generateCandidateStarts,
  getAvailableSlots
}
