/** The rental window a quote PROPOSED: the earliest start and latest end across
 *  its rental lines (`YYYY-MM-DD` strings compare correctly as text). Null when
 *  no rental line carries both dates. A quote line keeps its own window, so the
 *  span is the one window that covers them all. */
export function quoteRentalSpan(
  items: ReadonlyArray<{
    is_rental?: boolean | null
    rental_start_date?: string | null
    rental_end_date?: string | null
  }>,
): { start: string; end: string } | null {
  let start: string | null = null
  let end: string | null = null
  for (const it of items) {
    if (!it.is_rental || !it.rental_start_date || !it.rental_end_date) continue
    if (start === null || it.rental_start_date < start) start = it.rental_start_date
    if (end === null || it.rental_end_date > end) end = it.rental_end_date
  }
  return start && end ? { start, end } : null
}
