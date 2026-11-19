/**
 * Money precision helpers.
 *
 * The backend stores every money column as NUMERIC(…, 2) and its Pydantic
 * schemas reject any value with more than two decimal places
 * (`decimal_max_places` → 422). Typed cell input is already capped by the
 * grid regexes, but values can also arrive with more precision from an Excel
 * paste (the sheet shows 6464.65, the clipboard carries 6464.645) or from a
 * derived calculation. Everything that reaches the wire goes through here.
 */

/** Round to 2 decimal places, half-up, with a float-safe epsilon. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Wire keys that carry money with a 2-decimal-place cap on the backend. */
export const MONEY_WIRE_KEYS: ReadonlySet<string> = new Set([
  "rate",
  "list_price",
  "discount_amount",
  "discount_percentage",
  "tax_rate",
])

/**
 * Deep-copy `value`, rounding every number stored under a {@link MONEY_WIRE_KEYS}
 * key to 2 decimal places. Arrays, nested objects (BOM children, terms) and
 * non-money fields pass through untouched. Safe for any JSON-shaped payload.
 */
export function roundMoneyFields<T>(value: T): T {
  return walk(value, null) as T
}

function walk(node: unknown, key: string | null): unknown {
  if (Array.isArray(node)) return node.map((n) => walk(n, null))
  if (node !== null && typeof node === "object") {
    // Leave non-plain objects (File, Date, Blob…) alone — only JSON payload
    // objects are walked.
    const proto = Object.getPrototypeOf(node)
    if (proto !== Object.prototype && proto !== null) return node
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = walk(v, k)
    return out
  }
  if (typeof node === "number" && key !== null && MONEY_WIRE_KEYS.has(key)) return roundMoney(node)
  return node
}
