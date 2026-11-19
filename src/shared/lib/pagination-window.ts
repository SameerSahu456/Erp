import { PAGINATION } from "@/shared/constants";

/** Default count of visible numbered pages in the sliding window. */
const DEFAULT_WINDOW = PAGINATION.WINDOW;

/** Ellipsis token emitted between non-contiguous page numbers. */
export const ELLIPSIS = "…" as const;

export type PageToken = number | typeof ELLIPSIS;

/**
 * Build the page sequence for a compact pager: a WINDOW-wide run of numbered
 * pages that slides with the current page, with the last page pinned and an
 * ellipsis bridging any gap > 1. The first page is pinned only when it falls
 * outside the leading window.
 *
 * Single source of truth shared by every compact pager (TablePagination,
 * CrmListPaginationFooter) so the visible sequence can never drift.
 *
 *   page 1  of 30 → 1 2 3 4 5 … 30
 *   page 3  of 30 → 1 2 3 4 5 … 30
 *   page 8  of 30 → 1 … 6 7 8 9 10 … 30   (centered window)
 *   page 27 of 30 → 1 … 26 27 28 29 30
 *   page 30 of 30 → 1 … 26 27 28 29 30
 *
 * For totalPages ≤ window + 2 every page is shown (an ellipsis would save no
 * space over rendering them all).
 *
 * `window` overrides how many numbered pages the sliding run shows (default
 * `PAGINATION.WINDOW`). Pass a smaller value for narrow containers (e.g. the
 * activity-log sheet) so the same numbered sequence fits on one line instead
 * of wrapping.
 */
export function paginationWindow(
  current: number,
  totalPages: number,
  window: number = DEFAULT_WINDOW,
): PageToken[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= window + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Center the window on `current`, clamped so it never runs off either end.
  let start = Math.min(
    Math.max(1, current - Math.floor(window / 2)),
    totalPages - window + 1,
  );
  start = Math.max(1, start);
  const end = Math.min(start + window - 1, totalPages);

  const out: PageToken[] = [];
  if (start > 1) {
    out.push(1);
    if (start > 2) out.push(ELLIPSIS);
  }
  for (let p = start; p <= end; p++) out.push(p);
  if (end < totalPages) {
    if (end < totalPages - 1) out.push(ELLIPSIS);
    out.push(totalPages);
  }
  return out;
}
