// Uses Resend (https://resend.com) instead of Gmail SMTP because Render's
// free tier blocks outbound SMTP ports (465/587). Resend sends over HTTPS
// (port 443) which Render never blocks.
const { Resend } = require('resend')
require('dotenv').config()

const resend = new Resend(process.env.RESEND_API_KEY)

const notifyAddress = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER
const businessName  = process.env.BUSINESS_NAME || 'Sports Dietitian Coach'
const coachName     = process.env.COACH_NAME || ''
const fromAddress   = process.env.RESEND_FROM || 'onboarding@resend.dev'

function isEmailConfigured() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Email not configured (RESEND_API_KEY missing) — skipping email.')
    return false
  }
  return true
}

function bookingLines(booking) {
  const typeLabel = booking.appointmentType === 'body-composition'
    ? 'Body Composition Test'
    : 'Nutrition Consultation'

  return {
    typeLabel,
    lines: [
      'New booking request received.',
      '',
      `Type: ${typeLabel}`,
      booking.price ? `Price: ${booking.price}` : null,
      `Date: ${booking.preferredDate}`,
      `Time: ${booking.preferredTime}`,
      '',
      `Name: ${booking.name}`,
      `Email: ${booking.email}`,
      `Phone: ${booking.phone}`,
      booking.notes ? `Notes: ${booking.notes}` : null,
      '',
      'Status: pending — confirm or cancel from the admin dashboard.'
    ].filter(Boolean)
  }
}

async function sendBookingNotification(booking) {
  const results = await Promise.allSettled([
    sendAdminBookingEmail(booking),
    sendWhatsappNotification(booking)
  ])
  results.forEach((r) => { if (r.status === 'rejected') console.error(r.reason) })
}

async function sendAdminBookingEmail(booking) {
  if (!isEmailConfigured()) return

  const { typeLabel, lines } = bookingLines(booking)

  await resend.emails.send({
    from: fromAddress,
    to: notifyAddress,
    reply_to: `${booking.name} <${booking.email}>`,
    subject: `New booking: ${typeLabel} — ${booking.preferredDate} ${booking.preferredTime}`,
    text: lines.join('\n')
  })
}

async function sendClientStatusEmail(booking) {
  if (!isEmailConfigured()) return

  const { typeLabel } = bookingLines(booking)
  const signature   = coachName ? `${coachName}\n${businessName}` : businessName
  const isConfirmed = booking.status === 'confirmed'
  const statusText  = isConfirmed ? 'confirmed' : 'cancelled'

  await resend.emails.send({
    from: fromAddress,
    to: booking.email,
    reply_to: notifyAddress,
    subject: `Your booking has been ${statusText} — ${typeLabel}`,
    text: [
      `Hi ${booking.name},`,
      '',
      isConfirmed
        ? `Your ${typeLabel} booking has been confirmed.`
        : `Your ${typeLabel} booking request was not confirmed.`,
      '',
      'Booking details:',
      `Date: ${booking.preferredDate}`,
      `Time: ${booking.preferredTime}`,
      booking.price ? `Price: ${booking.price}` : null,
      '',
      isConfirmed
        ? 'We look forward to seeing you.'
        : 'Please contact us if you would like to choose another time.',
      '',
      'Thank you,',
      signature
    ].filter(Boolean).join('\n')
  })
}

async function sendWhatsappNotification(booking) {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO } = process.env
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TO) return
  if (typeof fetch !== 'function') {
    console.warn('WhatsApp notification requires Node 18+ fetch support.')
    return
  }

  const { lines } = bookingLines(booking)
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: WHATSAPP_TO,
        type: 'text',
        text: { preview_url: false, body: lines.join('\n') }
      })
    }
  )
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`WhatsApp notification failed: ${response.status} ${details}`)
  }
}

module.exports = { sendBookingNotification, sendClientStatusEmail }
