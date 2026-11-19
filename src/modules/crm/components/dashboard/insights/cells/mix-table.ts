import { PAGINATION } from '@/shared/constants'

// Shared knobs for the two "mix by period" cross-tabs — Condition Mix and
// Vertical Mix. They are the same widget over a different dimension, so a value
// that differs between them would read as a bug rather than a choice.

/** Default rows per page for both mix tables.
 *
 *  NOT `PAGINATION.DEFAULT_PAGE_SIZE` (10): the natural unit of these tables is
 *  a whole window, and 10 splits the commonest one — a 12-month year — across
 *  two pages, so the mix you came to read is never on screen at once. 25 covers
 *  12 months, 4 quarters, and the ~31 weekly buckets a year-to-date window
 *  produces.
 *
 *  Taken FROM `PAGE_SIZE_OPTIONS` rather than written as a literal, so the
 *  default is always a value the footer's dropdown actually offers (§16.6 — no
 *  view invents its own size). */
export const MIX_TABLE_PAGE_SIZE = PAGINATION.PAGE_SIZE_OPTIONS[1]

/** The row-total column key for both mix tables. Prefixed so it can never
 *  collide with a real column key — condition wire enums (`new_pull`) or
 *  vertical display labels (`End Customer`). Must be rendered LAST so it reads
 *  as the row sum. */
export const MIX_TOTAL_KEY = '__total'
