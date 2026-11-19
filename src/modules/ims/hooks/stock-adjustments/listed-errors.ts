import { toast } from "sonner";

import { ApiError } from "@shared/api/envelope";
import { notifyMutationError } from "@shared/api/notify-mutation-error";

import { STOCK_ADJUSTMENT_HOOK_STRINGS as S } from "./stock-adjustment-hooks.strings";

/** True when the failure carries a per-line / per-unit error list. The detail
 *  page renders that list in place (approval blocked, nothing changed), so a
 *  toast would only duplicate it (§6.8 #6 — exactly one error surface). */
export function hasListedErrors(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.errors?.length ?? 0) > 0;
}

/** onError for transitions whose error list the page renders inline. */
export function notifyUnlessListed(error: unknown): void {
  if (hasListedErrors(error)) return;
  notifyMutationError(error);
}

/** onError for calls with no inline surface: `notifyMutationError` stays silent
 *  on a field-level 422, which here would hide the failure entirely. */
export function notifyAlways(error: unknown): void {
  toast.error(error instanceof Error ? error.message : S.requestFailed);
}
