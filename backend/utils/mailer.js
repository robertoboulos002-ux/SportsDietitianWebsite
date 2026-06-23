// Uses Brevo (https://brevo.com) API — sends over HTTPS port 443 so it
// works on Render's free tier, and unlike Resend's free plan it can
// deliver to ANY recipient email address without domain verification.
require('dotenv').config()

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const notifyAddress = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER
const businessName  = process.env.BUSINESS_NAME || 'Sports Dietitian Coach'
const coachName     = process.env.COACH_NAME || ''
const fromEmail     = process.env.BREVO_FROM_EMAIL || process.env.GMAIL_USER
const fromName      = process.env.BREVO_FROM_NAME  || businessName

function isEmailConfigured() {
  if (!process.env.BREVO_API_KEY) {
    console.warn('Email not configured (BREVO_API_KEY missing) — skipping email.')
    return false
  }
  return true
}

async function sendEmail({ to, replyTo, subject, text }) {
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: to }],
      replyTo:     replyTo ? { email: replyTo } : undefined,
      subject,
      textContent: text
    })
  })

  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${details}`)
  }
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

  await sendEmail({
    to:      notifyAddress,
    replyTo: booking.email,
    subject: `New booking: ${typeLabel} — ${booking.preferredDate} ${booking.preferredTime}`,
    text:    lines.join('\n')
  })
}

async function sendClientStatusEmail(booking) {
  if (!isEmailConfigured()) return

  const { typeLabel } = bookingLines(booking)
  const signature   = coachName ? `${coachName}\n${businessName}` : businessName
  const isConfirmed = booking.status === 'confirmed'
  const statusText  = isConfirmed ? 'confirmed' : 'cancelled'

  await sendEmail({
    to:      booking.email,
    replyTo: notifyAddress,
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
      headers: {
        Authorization:  `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:   WHATSAPP_TO,
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
