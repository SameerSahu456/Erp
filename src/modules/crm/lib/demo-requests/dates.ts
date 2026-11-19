import { toISTDateKey } from "@/shared/lib/date"

const DAY_MS = 24 * 60 * 60 * 1000

// "Today" (and offsets from it) as an IST calendar day, `YYYY-MM-DD`.
//
// `new Date().toISOString().slice(0, 10)` is the UTC day — before 05:30 IST
// it is YESTERDAY's date, so a return-date `min`/floor computed that way lets
// the user pick a day the backend (which reasons in IST) considers past.
// Route through the shared IST bucket formatter instead.
export function todayISTDate(): string {
  return toISTDateKey(new Date().toISOString()) ?? ""
}

/** The IST calendar day `days` from now, `YYYY-MM-DD`. */
export function istDateInDays(days: number): string {
  return toISTDateKey(new Date(Date.now() + days * DAY_MS).toISOString()) ?? ""
}
