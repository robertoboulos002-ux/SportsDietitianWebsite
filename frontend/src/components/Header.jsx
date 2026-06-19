import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const navLinkClass = ({ isActive }) =>
  `font-display font-semibold text-sm tracking-wide uppercase transition-colors ${
    isActive ? 'text-ember' : 'text-ink hover:text-ember'
  }`

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-chalk/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-20">
        <Link to="/" className="font-display font-extrabold text-xl tracking-tight">
          Marane&nbsp;Lati
          <span className="block font-mono font-normal text-[10px] tracking-[0.2em] text-steel uppercase">
            Sports Dietitian . Fitness Trainer
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          <NavLink to="/" end className={navLinkClass}>Home</NavLink>
          <NavLink to="/about" className={navLinkClass}>About</NavLink>
          <NavLink to="/booking" className={navLinkClass}>Booking</NavLink>
          <Link
            to="/booking"
            className="font-display font-semibold text-sm uppercase tracking-wide bg-ink text-chalk px-5 py-2.5 hover:bg-ember transition-colors"
          >
            Book a session
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className={`block w-6 h-0.5 bg-ink transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block w-6 h-0.5 bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-ink transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-ink/10 bg-chalk px-6 py-6 flex flex-col gap-5">
          <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/about" className={navLinkClass} onClick={() => setOpen(false)}>About</NavLink>
          <NavLink to="/booking" className={navLinkClass} onClick={() => setOpen(false)}>Booking</NavLink>
          <Link
            to="/booking"
            onClick={() => setOpen(false)}
            className="font-display font-semibold text-sm uppercase tracking-wide bg-ink text-chalk px-5 py-3 text-center hover:bg-ember transition-colors"
          >
            Book a session
          </Link>
        </nav>
      )}
    </header>
  )
}
