// On localhost: empty string — Vite's proxy in vite.config.js forwards
// /api/* to the local backend automatically.
// On Vercel (production): VITE_API_URL is set to the Render backend URL
// in Vercel's environment variables dashboard, so fetch calls go directly
// to Render instead of hitting Vercel itself.
const API_BASE = import.meta.env.VITE_API_URL || ''
export default API_BASE
