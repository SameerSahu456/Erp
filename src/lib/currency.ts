/**
 * Single source of truth for currency rendering across the app.
 *
 * formatINR — full-precision currency for line items, totals, balances, ledgers.
 *   Use this for anything the user would expect to reconcile to the rupee.
 *   Decimals appear only when there ARE paise: ₹1,20,000 stays clean, while
 *   ₹1,234.50 keeps both places. Amounts in this ERP are whole rupees the large
 *   majority of the time, and a column of ".00" is pure noise the eye has to
 *   filter on every row.
 *
 *   Note this trades away decimal-point alignment in a mixed column (₹1,000
 *   above ₹1,234.50). That is the accepted cost — flagged here so the next
 *   reader knows it was a decision, not an oversight.
 *
 * formatINRCompact — KPI / dashboard tile display. Drops decimals by default to
 *   keep tiles skimmable. Pass `{ decimals: true }` to keep two decimal places
 *   when rendering a real amount on a detail / record page. The no-arg call is
 *   unchanged, so KPI / IMS / dashboard callers stay rounded.
 *
 * formatINRShort — abbreviates large amounts (₹1.2Cr, ₹45L) for charts and
 *   summary cards where vertical space is tight.
 */

const fmtFull = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const fmtCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Same shape as `fmtCompact`, but reached for a different reason: not to round
 *  a figure down for a tile, only to drop a fraction that is already zero. */
const fmtWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const fmtPlain = new Intl.NumberFormat('en-IN')

/** A plain count with Indian grouping and no ₹: 1,51,991. */
export function formatCount(n: number): string {
  return fmtPlain.format(n)
}

/**
 * Whether a value carries paise worth printing — i.e. a non-zero remainder once
 * rounded to the two decimals money is stored at. Drives whether the rendered
 * amount shows ".xx" at all.
 *
 * `1234.001` counts as WHOLE: it renders as ₹1,234.00 at two decimals, so the
 * decimals would be zeros either way.
 */
function hasPaise(value: number | string): boolean {
  if (typeof value === 'string') {
    // A digit test, never a float parse — string amounts exist precisely
    // because the value can exceed 2^53 (see `formatINRCompact`). Only the
    // first two decimals survive formatting, so only they get a vote.
    const frac = /\.(\d{1,2})/.exec(value.trim())
    return frac ? Number(frac[1]) !== 0 : false
  }
  // NaN / Infinity fall through to the 2-decimal formatter, which renders them
  // exactly as it does today.
  return Number.isFinite(value) ? Math.round(value * 100) % 100 !== 0 : true
}

/**
 * Intl.NumberFormat accepts a decimal string at runtime and formats its digits
 * exactly — no float64 round-trip. TypeScript types that overload as the
 * template-literal `${number}`, which a plain `string` can't satisfy
 * structurally, hence the assertion. The contract for string callers is that
 * the value is a numeric literal (what the backend's `DecimalAsString`
 * serializer emits); a non-numeric string yields NaN formatting, exactly as a
 * non-numeric value would today.
 */
function toFormattable(value: number | string): number | Intl.StringNumericLiteral {
  return typeof value === 'string' ? (value as Intl.StringNumericLiteral) : value
}

function formatINR(value: number): string {
  return (hasPaise(value) ? fmtFull : fmtWhole).format(value)
}

/**
 * Compact INR for KPI tiles — no decimals, rounded to the whole rupee.
 *
 * @param value  A number, or a decimal STRING for amounts that must not pass
 *   through float64. `Intl.NumberFormat` accepts a decimal string and formats
 *   its digits exactly, whereas `Number("9090909090909105")` is ...104 —
 *   past 2^53 the gap between doubles is 2, so odd integers don't exist.
 *   Callers holding a string amount (see `UserListItem.current_target`) should
 *   pass it straight through rather than parsing it first.
 * @param opts.decimals  When true, keep two decimal places instead of
 *   rounding — use on detail / record pages where the user needs the exact
 *   amount. Defaults to false so existing KPI / IMS / dashboard callers are
 *   unaffected. (Decimal mode is the same 2-decimal accounting format as
 *   `formatINR`.)
 */
function formatINRCompact(value: number | string, opts?: { decimals?: boolean }): string {
  const formatter = opts?.decimals
    ? // `decimals` means "show the exact amount", not "always print two
      // places" — so it follows `formatINR` and omits a zero fraction.
      hasPaise(value)
      ? fmtFull
      : fmtWhole
    : fmtCompact
  return formatter.format(toFormattable(value))
}

/**
 * Abbreviated INR (₹1.23Cr, ₹45.60L) for charts and tight summary cards.
 *
 * @param value  A number, or a decimal STRING (the shape money now arrives in
 *   from the API — see `DecimalAsString` on the backend).
 *
 *   Unlike `formatINR`/`formatINRCompact`, this one does ARITHMETIC (divide,
 *   toFixed) to abbreviate, so a string is parsed to a number first. That is
 *   lossy past 2^53 — but only in digits this format already discards: it
 *   renders two decimal places at Cr/L scale, so ₹9,09,09,09,09,09,09,105 and
 *   ...104 both print "₹909090909.09Cr". Use `formatINR`/`formatINRCompact`
 *   (Intl, exact on strings) anywhere the full number is shown.
 */
/** Decimal places kept at L / Cr scale.
 *
 *  TWO, not one. At one place the rounding was coarse enough to be wrong rather
 *  than merely approximate: ₹1,46,320 is 1.4632L, which rounds to "₹1.5L" — a
 *  ₹3,680 overstatement, ~2.5%, from a number the user can see is 1.46L. Two
 *  places round to ₹1.46L, an error of ₹320 (0.2%).
 *
 *  The residual error is one unit of the last place: ±₹500 at L scale, ±₹50,000
 *  at Cr. That is the cost of abbreviating at all — anywhere the exact figure
 *  matters, use `formatINR` / `formatINRCompact`, which are Intl-based and exact
 *  on decimal strings. */
const SHORT_DECIMALS = 2

/** The abbreviated magnitude, at `SHORT_DECIMALS` places WITH Indian digit
 *  grouping.
 *
 *  `toFixed` alone does not group, which is invisible while the abbreviated
 *  number stays small (`3.61`) and unreadable once it does not: ₹2,00,00,20,00,000
 *  (20,000.2 crore) rendered as "₹20000.20Cr", a run of digits the eye cannot
 *  scale. Grouped it reads "₹20,000.20Cr".
 *
 *  Below 1,000 in the abbreviated unit this is byte-identical to `toFixed`, so
 *  every existing label (₹1.46L, ₹3.61Cr) is unchanged. */
const fmtShortMagnitude = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: SHORT_DECIMALS,
  maximumFractionDigits: SHORT_DECIMALS,
})

function formatINRShort(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(n)) return "—"
  if (Math.abs(n) >= 10_000_000)
    return `₹${fmtShortMagnitude.format(n / 10_000_000)}Cr`
  if (Math.abs(n) >= 100_000) return `₹${fmtShortMagnitude.format(n / 100_000)}L`
  // Below 1L the value is well inside float range, so exactness is preserved.
  return `₹${fmtPlain.format(n)}`
}

export { formatINR, formatINRCompact, formatINRShort }
