const express = require('express')
const pool = require('../db/pool')

const router = express.Router()
const EMAIL_RE = /^\S+@\S+\.\S+$/

// POST /api/newsletter — subscribe an email address
router.post('/', async (req, res) => {
  const { email } = req.body || {}

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  try {
    await pool.execute(
      `INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)`,
      [email.trim().toLowerCase()]
    )
    res.status(201).json({ status: 'subscribed' })
  } catch (err) {
    console.error('Failed to subscribe email:', err)
    res.status(500).json({ error: 'Could not subscribe right now. Please try again.' })
  }
})

module.exports = router
