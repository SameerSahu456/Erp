// Product-voice copy for specific API *business codes*, applied centrally in
// the response interceptor (see `envelope.ts` → `formatPrimaryError`). The
// backend already scrubs raw ids out of every failure message, so this layer
// is NOT about hiding leaks — it's about giving a handful of codes consistent,
// friendly, actionable wording that reads the same everywhere it surfaces.
//
// It is deliberately OPT-IN and SMALL. A code only belongs here when a single
// STATIC sentence is strictly better than whatever the backend sends:
//
//   • infrastructure codes the user can't act on precisely (a 500, a DB
//     constraint) — a calm "try again" beats the raw technical sentence;
//   • named flows whose backend message is terse AND carries no dynamic
//     detail.
//
// Do NOT add a code whose backend message embeds specifics the user needs —
// a document number, a name, a count, a deep-link id on `errors`/`data`
// (e.g. MI_RETURN_BLOCKED_BY_DISPATCH names the blocking dispatch, and
// CONTACT_EMAIL_EXISTS carries the existing id for a deep link). Overriding
// those with a static sentence throws the useful part away. When in doubt,
// leave it out and let the (already-clean) backend message through.
export const API_ERROR_MESSAGES: Record<string, string> = {
  // Generic server failure — "An unexpected error occurred" is accurate but
  // cold; the user's only real move is to retry.
  INTERNAL_ERROR: "Something went wrong on our end. Please try again in a moment.",
  // DB constraint fell through to the defensive handler. The backend sentence
  // names "database constraint", which means nothing to an operator.
  INTEGRITY_ERROR:
    "We couldn't save that because it conflicts with existing data. Refresh and try again.",
  // Rate limiter. Rarely hit, but when it is the raw code is opaque.
  TOO_MANY_REQUESTS: "You're doing that a bit too fast. Wait a moment and try again.",
};

/**
 * Friendly copy for a business code, or `undefined` when the code isn't in the
 * catalog (the caller then keeps the backend message). Centralised so every
 * `error.message` render site is consistent with no per-callsite wiring.
 */
export function friendlyApiMessage(businessCode: string | null | undefined): string | undefined {
  if (!businessCode) return undefined;
  return API_ERROR_MESSAGES[businessCode];
}
