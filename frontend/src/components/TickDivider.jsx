// Recurring signature motif: a row of measurement ticks, like a tape measure
// or a body-composition caliper scale. Used to divide sections instead of a
// plain horizontal rule, tying the visual language back to the coach's work.
export default function TickDivider({ light = false, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`tick-rule ${light ? 'tick-rule-light' : ''} ${className}`}
    />
  )
}
