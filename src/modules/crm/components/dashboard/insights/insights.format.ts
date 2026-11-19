// Percentage formatting for the insight board.
//
// Every share/rate on the board used to render as `pct.toFixed(0)`, which
// rounds 99.56 to "100%" — a row that is NOT the whole result set reading as
// if it were. The same rounding hid the opposite case: a 0.4% sliver read as
// "0%", i.e. "nothing", when it is not nothing.
//
// The value is now shown AS SENT. The backend already computes `share` at two
// decimals (`round(float(value / total) * 100, 2)`), so the only thing done
// here is trimming binary-float noise to that same precision — the donut
// computes its own share from the slice values and can produce
// 99.55999999999999. Trailing zeros are dropped so a clean 50 stays "50%"
// rather than becoming "50.00%".

export function formatSharePct(pct: number): string {
  if (!Number.isFinite(pct)) return '0%'
  return `${Number(pct.toFixed(2))}%`
}

// Bar WIDTH for a share. LITERAL — 0.38% draws 0.38% of the track, full stop.
//
// This was briefly a sqrt scale, to pull the sub-1% tail apart visually. Don't
// bring that back: it drew 0.38% as a 6% bar, which reads as "small but real"
// when the truth is "essentially nothing". A bar that lies about magnitude is
// worse than a bar that can't resolve two tiny values.
//
// The consequence is accepted deliberately: with data spanning ~8700x
// (99.56% → 0.01%), everything below ~1% is sub-pixel and bottoms out at the
// 2px floor its caller applies, so the smallest rows do look alike. That is
// honest — they ARE all ~0 next to the leader. The exact figure beside the bar
// (`formatSharePct`) is what distinguishes them.
export function shareBarWidthPct(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0
  return Math.min(pct, 100)
}

// ── Conversion-rate tone ────────────────────────────────────────────────────
//
// Shared by every card on the board that renders a RATE with a proportional bar
// — the summary strip's Quote→SO Win / Lead→Order Rate tiles and the Sales Funnel
// card's per-stage conversion. Lives here rather than in either component so the
// two cannot drift: a funnel row and a summary tile showing the same percentage
// must never disagree about whether it is good or bad.
//
// Colours are the reference's Tailwind numbered scales, which is sanctioned:
// `tokens/colors.css` keeps the numbered scales off the ramp *on purpose* so
// dashboards can use them decoratively, and §8.5 targets raw hex / rgb() /
// `var(--x,#hex)` fallbacks — none of which appear here.

// TWO tiers, not three. There was a middle `warn` tier (25–40%) rendered in
// amber, which read as brown against the board's neutral surfaces and made
// "this is fine" and "this is a problem" hard to tell apart at a glance. A rate
// is either healthy or it is not; anything under the threshold is red.
export type RateTone = 'good' | 'bad'

/** Threshold is the board's existing healthy mark: 40%+ is good, anything below
 *  it is bad. Callers must handle a NULL rate themselves — "no denominator" is
 *  not a bad result and has no tone. */
export const rateTone = (rate: number): RateTone => (rate >= 40 ? 'good' : 'bad')

/** Text colour for a toned rate value. */
export const RATE_TEXT_CLASS: Record<RateTone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-rose-600 dark:text-rose-400',
}

/** Fill colour for a toned rate's progress bar. */
export const RATE_BAR_CLASS: Record<RateTone, string> = {
  good: 'bg-emerald-500',
  bad: 'bg-rose-500',
}
