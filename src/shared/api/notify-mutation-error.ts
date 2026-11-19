import { toast } from "sonner";

import { isFieldValidationError } from "./server-field-errors";

/**
 * Standard mutation `onError` handler. Toasts the error message, EXCEPT for a
 * field-validation error (a 422 that names request fields) — those are shown
 * inline on the form by `applyServerFieldErrors`, so a toast would just
 * duplicate them away from the input the user must fix.
 *
 * Use as `onError: notifyMutationError` in mutation hooks instead of the bare
 * `(e) => toast.error(e.message)`, so the form/hook split is consistent: the
 * hook never toasts a field error, the form always inlines it.
 */
export function notifyMutationError(error: unknown): void {
  if (isFieldValidationError(error)) return; // shown inline on the form
  const message = error instanceof Error ? error.message : "Request failed";
  toast.error(message);
}
