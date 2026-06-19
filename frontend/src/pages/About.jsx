import { Link } from 'react-router-dom'
import TickDivider from '../components/TickDivider.jsx'

const credentials = [
  'MSc. Sports Nutrition & Physiology - USJ',
  'Registered Dietitian (RD), Lebanese Order of Dietitians',
  'ISAK Level 1 Anthropometrist (body composition assessment)',
  'CSSD — Board Certified Specialist in Sports Dietetics'
]

export default function About() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-20 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss">About</p>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl leading-tight mt-3">
            Trained as a dietitian.
            <br />
            Obsessed with athletes.
          </h1>
          <p className="text-steel mt-6 leading-relaxed">
            I'm Marane — a sports dietitian working with runners, cyclists, lifters,
            and team-sport athletes who want their nutrition to hold up under
            real training load. My approach starts with data: what you're
            actually eating, how your body composition shifts over a training
            block, and where the gap is between the two.
          </p>
          <p className="text-steel mt-4 leading-relaxed">
            No meal-plan templates. Every plan is built around your training
            calendar, your schedule, and the foods you'll actually eat
            consistently — because the best nutrition plan is the one you can
            follow on a Tuesday at 6am before a track session.
          </p>
          <Link
            to="/booking"
            className="inline-block mt-8 font-display font-semibold uppercase text-sm tracking-wide bg-ink text-chalk px-6 py-3.5 hover:bg-ember transition-colors"
          >
            Book a consultation
          </Link>
        </div>

        <div className="border border-ink/15 p-7">
          <p className="font-display font-semibold text-sm uppercase tracking-wide text-steel">
            Credentials
          </p>
          <ul className="mt-4 space-y-3 font-mono text-sm">
            {credentials.map((c) => (
              <li key={c} className="flex gap-3">
                <span className="text-ember">—</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TickDivider />

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <h2 className="font-display font-bold text-2xl md:text-3xl">How I work</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-8">
          {[
            {
              step: 'Baseline',
              text: 'We start with a full intake: training history, current eating patterns, and a body composition measurement.'
            },
            {
              step: 'Plan',
              text: 'A fuelling plan built around your training calendar — periodized, not static.'
            },
            {
              step: 'Track',
              text: 'Quarterly body comp re-tests show what\u2019s working, in numbers, not impressions.'
            }
          ].map((s, i) => (
            <div key={s.step}>
              <p className="font-mono text-xs text-steel">0{i + 1}</p>
              <h3 className="font-display font-bold text-lg mt-2">{s.step}</h3>
              <p className="text-steel text-sm mt-2 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
