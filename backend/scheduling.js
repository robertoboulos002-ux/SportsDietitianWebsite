// Single source of truth for appointment durations and business hours.
// Both the availability endpoint and the booking conflict check import this,
// so the two can never drift out of sync with each other.

const APPOINTMENT_DURATIONS_MIN = {
  consultation: 50,
  'body-composition': 15
}

// Business hours, split around a lunch break. Slots are offered every
// 15 minutes within these windows — fine enough to fit a short 15-minute
// body composition test right after a longer consultation ends.
const BUSINESS_BLOCKS = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '18:00' }
]
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

// Does `durationMin` minutes starting at `start` fit inside a single
// business block without spilling into the lunch break or past closing?
function fitsBusinessHours(start, durationMin) {
  const startMin = timeToMinutes(start)
  const endMin = startMin + durationMin
  return BUSINESS_BLOCKS.some(
    (block) => startMin >= timeToMinutes(block.start) && endMin <= timeToMinutes(block.end)
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

// All 15-minute candidate start times across the business blocks.
function generateCandidateStarts() {
  const candidates = []
  for (const block of BUSINESS_BLOCKS) {
    for (let m = timeToMinutes(block.start); m < timeToMinutes(block.end); m += SLOT_STEP_MIN) {
      candidates.push(minutesToTime(m))
    }
  }
  return candidates
}

// Given the appointment type being requested and the day's existing active
// bookings (each with its own time + type), return the start times that
// fit business hours and don't overlap anything already booked.
function getAvailableSlots(appointmentType, existingBookings) {
  const duration = getDuration(appointmentType)
  if (!duration) return []

  return generateCandidateStarts().filter((candidate) => {
    if (!fitsBusinessHours(candidate, duration)) return false

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
  fitsBusinessHours,
  rangesOverlap,
  generateCandidateStarts,
  getAvailableSlots
}
