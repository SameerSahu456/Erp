/**
 * Single source of truth for currency rendering across the app.
 *
 * formatINR — full-precision currency for line items, totals, balances, ledgers.
 *   Two decimals always (accounting standard). Use this for anything the user
 *   would expect to reconcile to the rupee.
 *
 * formatINRCompact — KPI / dashboard tile display. Drops decimals to keep tiles
 *   skimmable. Never use for line-item or invoice totals.
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

const fmtPlain = new Intl.NumberFormat('en-IN')

function formatINR(value: number): string {
  return fmtFull.format(value)
}

function formatINRCompact(value: number): string {
  return fmtCompact.format(value)
}

function formatINRShort(value: number): string {
  if (Math.abs(value) >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`
  return `₹${fmtPlain.format(value)}`
}

export { formatINR, formatINRCompact, formatINRShort }
