import { useEffect } from "react"
import { toast } from "sonner"

import { ApiError } from "@/shared/api/envelope"

// Toast id shared by every list so one failing request never stacks duplicates.
const QUERY_ERROR_TOAST_ID = "list-query-error"

/**
 * Toast a failed list/query once per distinct error, with the backend's own
 * message (`ApiError.message` already carries the first field error, e.g.
 * "min_deal_value: Decimal input should have no more than 14 digits in total").
 *
 * Skips 401/403 — those have dedicated handling (session expiry / the no-access
 * state) and a toast on top would just be noise. Pass the query's `error`
 * (null/undefined while healthy); the toast re-fires only when the error object
 * changes, not on every render.
 */
export function useQueryErrorToast(error: unknown): void {
  useEffect(() => {
    if (!error) return
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) return
    const message = error instanceof Error && error.message ? error.message : "Request failed"
    toast.error(message, { id: QUERY_ERROR_TOAST_ID })
  }, [error])
}
