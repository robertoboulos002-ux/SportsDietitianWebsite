const express = require('express')
const cors = require('cors')
require('dotenv').config()

const bookingsRouter = require('./routes/bookings')
const newsletterRouter = require('./routes/newsletter')
const availabilityRouter = require('./routes/availability')
const availabilityWindowsRouter = require('./routes/availabilityWindows')

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/bookings', bookingsRouter)
app.use('/api/newsletter', newsletterRouter)
app.use('/api/availability', availabilityRouter)
app.use('/api/availability-windows', availabilityWindowsRouter)

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Unexpected server error.' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
