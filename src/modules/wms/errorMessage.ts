/**
 * Shared error-to-message helper for WMS. Keeps the generic fallback copy in
 * one place (§16.12) instead of duplicating the same string across every
 * mutation hook's local `errMsg` helper.
 */

/** Shown when a thrown value carries no usable message of its own. */
export const GENERIC_ERROR_FALLBACK = "Something went wrong. Please try again.";

/** Resolve any thrown error to a user-facing message, falling back to the
 *  generic line when it isn't an `Error` instance. */
export const errMsg = (e: unknown, fallback: string = GENERIC_ERROR_FALLBACK): string =>
  e instanceof Error && e.message ? e.message : fallback;
