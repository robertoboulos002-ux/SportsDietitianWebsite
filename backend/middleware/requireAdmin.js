// Shared admin auth check, used by any route only the dietitian should
// reach. Pass the password via the x-admin-password header.
function requireAdmin(req, res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD
  const submittedPassword = req.get('x-admin-password')

  if (!configuredPassword) {
    return res.status(503).json({ error: 'Admin dashboard is not configured. Set ADMIN_PASSWORD in .env.' })
  }
  if (submittedPassword !== configuredPassword) {
    return res.status(401).json({ error: 'Invalid admin password.' })
  }

  next()
}

module.exports = requireAdmin
