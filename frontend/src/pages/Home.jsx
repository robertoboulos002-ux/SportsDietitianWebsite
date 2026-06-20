import { Link } from 'react-router-dom'
import TickDivider from '../components/TickDivider.jsx'

const stats = [
  { value: '9+ years', label: 'coaching athletes' },
  { value: '430+', label: 'athletes coached' },
  { value: '94%', label: 'Pre/Postnatal Coach' },
  { value: '90%', label: 'hit their target metric' }
]

const services = [
  {
    title: 'Nutrition Consultation',
    duration: '50 min - in-person or video',
    price: '$120',
    description:
      'A 1:1 session to build a fuelling plan around your training load, goals, and schedule - no generic meal plans.',
    type: 'consultation'
  },
  {
    title: 'Body Composition Test',
    duration: '15 min - in-person only',
    price: '$75',
    description:
      'Skinfold and circumference measurements, tracked over time, so progress is read from data instead of the scale.',
    type: 'body-composition'
  }
]

export default function Home() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="grid md:grid-cols-[300px_1fr] gap-10 md:gap-14 items-start">
          {/* Coach portrait */}
          <div className="w-48 md:w-full mx-auto md:mx-0">
            <img
              src="/images/coach-portrait.jpg"
              alt="Marane Lati, sports dietitian coach"
              loading="eager"
              className="block w-full h-auto border border-ink/10"
            />
          </div>

          {/* Headline + copy */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss">
              Sports Dietitian &amp; Body Composition Coach
            </p>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-[1.05] mt-4 max-w-3xl">
              Fuel your training.
              <br />
              Measure what matters.
            </h1>
            <p className="text-steel text-lg mt-6 max-w-xl">
              I help athletes and active people eat in a way that actually supports
              performance - backed by real body composition data.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/booking"
                className="font-display font-semibold uppercase text-sm tracking-wide bg-ink text-chalk px-6 py-3.5 hover:bg-ember transition-colors"
              >
                Book a consultation
              </Link>
              <Link
                to="/about"
                className="font-display font-semibold uppercase text-sm tracking-wide border border-ink px-6 py-3.5 hover:border-ember hover:text-ember transition-colors"
              >
                Meet your coach
              </Link>
            </div>

            <div className="mt-14 flex flex-wrap gap-x-10 gap-y-4 font-mono">
              {stats.map((s) => (
                <div key={s.label}>
                  <span className="text-2xl font-semibold text-ember">{s.value}</span>
                  <span className="block text-xs uppercase tracking-wide text-steel mt-1">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TickDivider />

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <h2 className="font-display font-bold text-2xl md:text-3xl">Book a session</h2>
        <p className="text-steel mt-2 max-w-lg">
          Two ways to get started - pick the one that fits where you are right now.
        </p>

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {services.map((s) => (
            <Link
              key={s.type}
              to={`/booking?type=${s.type}`}
              className="group block border border-ink/15 p-7 hover:border-ember transition-colors"
            >
              <p className="font-mono text-xs uppercase tracking-wide text-steel">{s.duration}</p>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <h3 className="font-display font-bold text-xl">{s.title}</h3>
                <span className="font-mono text-sm text-ember">{s.price}</span>
              </div>
              <p className="text-steel mt-3 text-sm leading-relaxed">{s.description}</p>
              <span className="inline-block mt-5 font-display font-semibold text-sm uppercase tracking-wide text-ember">
                Book this -&gt;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <TickDivider />

      <section className="bg-moss/5">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid md:grid-cols-3 gap-8">
          {[
            {
              quote:
                'My race-week fuelling finally clicked once we tied it to my actual training calendar instead of a generic plan.',
              name: 'Karim T.',
              role: 'Marathon runner'
            },
            {
              quote:
                'Quarterly body comp checks gave me numbers to train against, not just a number on the scale.',
              name: 'Sara M.',
              role: 'CrossFit athlete'
            },
            {
              quote:
                'Practical, specific, and never preachy. I left every session with one clear thing to change.',
              name: 'Joe A.',
              role: 'Amateur cyclist'
            }
          ].map((t) => (
            <figure key={t.name}>
              <blockquote className="text-ink leading-relaxed">"{t.quote}"</blockquote>
              <figcaption className="mt-4 font-mono text-xs uppercase tracking-wide text-steel">
                {t.name} - {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-ink text-chalk">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl">
            Ready to train your nutrition like you train your body?
          </h2>
          <Link
            to="/booking"
            className="inline-block mt-7 font-display font-semibold uppercase text-sm tracking-wide bg-ember text-ink px-7 py-3.5 hover:bg-citrus transition-colors"
          >
            Book your first session
          </Link>
        </div>
      </section>
    </div>
  )
}
