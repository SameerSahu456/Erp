/**
 * Display-time resolution of the `{{quote.validity_days}}` Terms & Conditions
 * token.
 *
 * The token is deliberately kept LITERAL in the stored quote snapshot (the
 * backend defers it — see `quote_terms_snapshot_service._DEFERRED_TOKENS`) so
 * the edit builder round-trips it and the day count stays live against the
 * quote's *current* `valid_until`. The backend PDF resolves it at render time;
 * this mirrors that resolution on screen so the read-only detail view shows the
 * real number — while the edit textarea keeps showing the raw
 * `{{quote.validity_days}}`. Never feed the resolved output back into a save
 * payload, or the day count would freeze.
 *
 * Grammar fix-ups match the backend renderer
 * (`template_renderer.resolve_deferred_tokens`): singular "1 day", "till today"
 * for a same-day validity, and "—" when the quote has no validity date.
 */

const VALIDITY_DAYS_TOKEN = /\{\{\s*quote\.validity_days\s*\}\}/g

/** Substitute `{{quote.validity_days}}` in a clause body for display. */
export function resolveValidityToken(body: string, validityDays: number | null): string {
  const value = validityDays === null ? "—" : String(validityDays)
  return body
    .replace(VALIDITY_DAYS_TOKEN, value)
    .replace(/\b1 days\b/g, "1 day")
    .replace(/for 0 days from the date of issue/gi, "till today")
    .replace(/\bfor 0 days\b/gi, "till today")
}

/**
 * Day count a validity clause resolves to: `valid_until − issue date`, matching
 * the backend's `(valid_until - created_at.date()).days`. Both dates are
 * compared on the UTC calendar (the basis the stored timestamp + PDF use) so
 * screen and PDF agree. Returns `null` when either date is missing/unparseable
 * — rendered as "—" by `resolveValidityToken`.
 */
export function validityDaysBetween(
  validUntil: string | null | undefined,
  issuedOnIso: string | null | undefined,
): number | null {
  if (!validUntil || !issuedOnIso) return null
  const issued = new Date(issuedOnIso)
  if (Number.isNaN(issued.getTime())) return null
  const [y, m, d] = validUntil.split("-").map(Number)
  if (!y || !m || !d) return null
  const validMs = Date.UTC(y, m - 1, d)
  const issuedMs = Date.UTC(issued.getUTCFullYear(), issued.getUTCMonth(), issued.getUTCDate())
  return Math.round((validMs - issuedMs) / 86_400_000)
}
