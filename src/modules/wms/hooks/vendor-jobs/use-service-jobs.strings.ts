/**
 * Toast copy for vendor-job mutations (§16.12 — no naked strings, hook copy in a
 * co-located `*.strings.ts`).
 *
 * Failures are surfaced inline in each dialog (`submitError`), so only the
 * green success toast lives here — a red error toast on top would duplicate the
 * in-dialog message (§0.13 "no duplicate toast spam").
 */
export const USE_SERVICE_JOBS_STRINGS = {
  success: {
    send: "Sent to vendor",
    receive: "Marked received",
    resend: "Resent to vendor",
    cancel: "Request cancelled",
  },
} as const
