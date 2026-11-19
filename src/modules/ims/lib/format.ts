// IMS-wide number / currency / percent formatting.
//
// Rule the whole module follows: a value whose decimal portion is *all
// zeros* renders without the decimal at all. Decimals carrying any
// non-zero digit keep their full precision. So:
//
//   10        → "10"
//   10.00     → "10"
//   10.20     → "10.20"
//   10.50     → "10.50"
//   10.05     → "10.05"
//   ₹10.00    → "₹10"
//   ₹10.20    → "₹10.20"
//   ₹1,000.00 → "₹1,000"
//
// Implementation: format the number with a fixed N decimal places first
// (so "10.20" stays "10.20" instead of collapsing to "10.2"), then strip
// a trailing `.0+` suffix when — and only when — every digit after the
// decimal point is a zero. The regex `\.0+(?=\D|$)` matches "dot,
// one-or-more zeros, followed by a non-digit OR end" — that lookahead
// prevents it from eating the "10" out of "10.05" or the "5" out of
// "10.50".

/** Strip a trailing `.0+` from a number-shaped string. */
const trimAllZeroDecimal = (s: string): string =>
  s.replace(/\.0+(?=\D|$)/, "");

/**
 * Format a plain number with up to `decimals` places, then drop the
 * decimal entirely if every digit is a zero. Use for raw numeric
 * displays (GST %, rates) where no currency symbol or thousands
 * separator is needed.
 */
export function formatTrimZeros(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return String(n);
  return trimAllZeroDecimal(n.toFixed(decimals));
}

// Single canonical INR formatter for IMS. `minimumFractionDigits: 2`
// keeps "10.20" intact through Intl (Intl would otherwise drop the
// trailing zero); we strip the .00 ourselves so "10.00" → "10".
const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as INR with the IMS trimming rule applied.
 *   1000     → "₹1,000"
 *   1000.5   → "₹1,000.50"
 *   1000.50  → "₹1,000.50"
 *   1000.05  → "₹1,000.05"
 *   1000.00  → "₹1,000"
 */
export function formatINR(n: number): string {
  if (!Number.isFinite(n)) return inrFmt.format(0);
  return trimAllZeroDecimal(inrFmt.format(n));
}

/**
 * Format a percentage value with the IMS trimming rule. Pass the
 * percentage as the actual rate (e.g. `18` for 18%, not `0.18`).
 *   18      → "18%"
 *   18.00   → "18%"
 *   18.50   → "18.50%"
 *   5       → "5%"
 *   0       → "0%"
 */
export function formatPercent(n: number, decimals = 2): string {
  return `${formatTrimZeros(n, decimals)}%`;
}

export { formatBytes } from "@shared/lib/format-bytes";

const countFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Whole-number count with Indian digit grouping: 1234567 → "12,34,567". */
export function formatCount(n: number): string {
  return countFmt.format(n);
}
