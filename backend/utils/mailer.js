const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

const notifyAddress = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER

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
      'Status: pending - confirm or cancel it from the admin dashboard.'
    ].filter(Boolean)
  }
}

async function sendBookingNotification(booking) {
  const results = await Promise.allSettled([
    sendAdminBookingEmail(booking),
    sendWhatsappNotification(booking)
  ])

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(result.reason)
    }
  })
}

function isEmailConfigured() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Email not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing) - skipping notification email.')
    return false
  }

  return true
}

async function sendAdminBookingEmail(booking) {
  if (!isEmailConfigured()) return

  const { typeLabel, lines } = bookingLines(booking)

  await transporter.sendMail({
    from: `"Booking system" <${process.env.GMAIL_USER}>`,
    to: notifyAddress,
    replyTo: `"${booking.name}" <${booking.email}>`,
    subject: `New booking: ${typeLabel} - ${booking.preferredDate} ${booking.preferredTime}`,
    text: lines.join('\n')
  })
}

async function sendClientStatusEmail(booking) {
  if (!isEmailConfigured()) return

  const { typeLabel } = bookingLines(booking)
  const businessName = process.env.BUSINESS_NAME || 'Sports Dietitian Coach'
  const coachName = process.env.COACH_NAME
  const signature = coachName ? `${coachName}\n${businessName}` : businessName
  const replyTo = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER
  const isConfirmed = booking.status === 'confirmed'
  const statusText = isConfirmed ? 'confirmed' : 'cancelled'

  await transporter.sendMail({
    from: `"${businessName}" <${process.env.GMAIL_USER}>`,
    to: booking.email,
    replyTo,
    subject: `Your booking has been ${statusText} - ${typeLabel}`,
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
      `Thank you,`,
      signature
    ].filter(Boolean).join('\n')
  })
}

async function sendWhatsappNotification(booking) {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO } = process.env
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TO) {
    return
  }
  if (typeof fetch !== 'function') {
    console.warn('WhatsApp notification requires Node 18+ fetch support.')
    return
  }

  const { lines } = bookingLines(booking)
  const response = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: WHATSAPP_TO,
      type: 'text',
      text: { preview_url: false, body: lines.join('\n') }
    })
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`WhatsApp notification failed: ${response.status} ${details}`)
  }
}

module.exports = { sendBookingNotification, sendClientStatusEmail }