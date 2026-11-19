import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PAGINATION } from "@/shared/constants";
import { ELLIPSIS, paginationWindow } from "@/shared/lib/pagination-window";

import { TABLE_PAGINATION_STRINGS as S } from './table-pagination.strings'

interface TablePaginationProps {
  /** Current page (1-indexed). */
  page: number;
  /** Total page count. */
  totalPages: number;
  /** Current page size. */
  pageSize: number;
  /** Total row count across all pages. */
  total: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  /** When omitted, the page-size dropdown is hidden. */
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /**
   * Narrow-container layout: always stack the label above the controls and let
   * the numbered pages wrap, instead of the viewport-based `sm:` row layout.
   * For bounded containers like the activity-log slide-over sheet, where the
   * component is far narrower than the viewport and the `sm:` breakpoint would
   * otherwise keep it in one overflowing row.
   */
  compact?: boolean;
  className?: string;
  /**
   * When true, a page-change or page-size click scrolls the pagination's
   * containing card (`[data-slot="card"]`) back into view. For very tall
   * tables — the insight-dashboard cards at page-size 100 pack ~100 rows into
   * one card — the pager sits far below the newly-loaded rows, so clicking
   * "next" leaves the user parked at the bottom of the last page's data
   * rather than the top of the new page's. Opt-in — most list pages don't
   * need this, they already sit inside a viewport-height ListPageShell.
   */
  scrollCardIntoView?: boolean;
}

/**
 * Table pagination, using the project's canonical `.cpt-pg-btn` class for
 * numbered pages and `<Button variant="outline" size="sm">` for the
 * prev/next chevrons — same vocabulary the existing StockPage,
 * PMAssignmentsPage, and BMT pagers use. The visible page sequence is a
 * sliding 5-wide window (see `paginationWindow`) with the last page pinned
 * and ellipses bridging any gap > 1 (page 1 of 30 renders "1 2 3 4 5 … 30";
 * page 10 of 30 renders "1 … 8 9 10 11 12 … 30").
 *
 * Optional opt-in widget:
 *   - Page-size <Select> ("10 / page"), shown only when `onPageSizeChange`
 *     is wired by the caller.
 *
 * Self-gating — callers render this unconditionally and let it decide. Every
 * control here disappears when it cannot do anything:
 *   - `total === 0`   → renders nothing at all. The table above already shows
 *                       its empty state; a footer over it is duplicate noise.
 *   - `totalPages<=1` → hides the numbered pages + prev/next (they would be a
 *                       lone disabled "1").
 *   - `total <= min(pageSizeOptions)`
 *                     → also hides the page-size <Select>: below the smallest
 *                       option every size shows the identical rows.
 *   - neither control left
 *                     → renders nothing at all. A bare "Showing 1-8 of 8" under
 *                       eight visible rows says nothing the table doesn't.
 * So a short list has no footer — no dead chrome. A
 * `{total > 0 && <TablePagination …/>}` guard at a call site is redundant;
 * don't add new ones.
 */
export function TablePagination({
  page,
  totalPages,
  pageSize,
  total,
  isFetching,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS,
  compact = false,
  className,
  scrollCardIntoView = false,
}: TablePaginationProps) {
  // No `total === 0` branch: that case returns null below, so the range is
  // only ever computed for a non-empty result set.
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  // Compact (narrow-container) pagers show a 3-wide window so the numbered
  // run — still with pinned first/last page + ellipses — fits on one line in
  // a sheet instead of wrapping and orphaning the next arrow.
  const visiblePages = useMemo(
    () => paginationWindow(page, totalPages, compact ? 3 : undefined),
    [page, totalPages, compact],
  );

  // Only used for the opt-in `scrollCardIntoView` — a ref on the pager's root
  // so we can walk up to the containing card without needing a prop drilled
  // down from the caller.
  const rootRef = useRef<HTMLDivElement>(null);

  // rAF lets React commit the URL/data update first so the newly-loaded rows
  // are what scrolls into view, not the previous page's tail.
  const scrollUp = () => {
    if (!scrollCardIntoView) return;
    requestAnimationFrame(() => {
      const card = rootRef.current?.closest('[data-slot="card"]');
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePageChange = (p: number) => {
    onPageChange(p);
    scrollUp();
  };
  const handlePageSizeChange = (s: number) => {
    onPageSizeChange?.(s);
    scrollUp();
  };

  const goPrev = () => page > 1 && handlePageChange(page - 1);
  const goNext = () => page < totalPages && handlePageChange(page + 1);

  // Nothing to page through and nothing a page size could change — the table's
  // own empty state is already the message, so a footer restating it as
  // "No results" over a dead "1" button is pure noise. Must sit below the
  // hooks above (rules-of-hooks), not at the top of the component.
  if (total === 0) return null;

  // Everything fits one page: both chevrons would be disabled and the numbered
  // run collapses to a lone "1" (paginationWindow returns [1] for totalPages<=1).
  const showPageNav = totalPages > 1;

  // The page-size <Select> is only worth showing when some option would change
  // what the user sees. Below the SMALLEST option every choice renders the same
  // rows — 8 rows with [10,25,50,100] looks identical at every size — so the
  // control is inert and comes off.
  //
  // Deliberately compared against the smallest option, NOT the current
  // `pageSize`: at 40 rows on size 100 it all fits one page, yet dropping to 10
  // really does repaginate, so the select stays. And this can't strand anyone at
  // an unwanted size — it only hides where no size has a visible effect, and
  // reappears the moment one would.
  const smallestPageSize = Math.min(...pageSizeOptions);
  const showPageSize = Boolean(onPageSizeChange) && total > smallestPageSize;

  // No pages to move between and no page size worth changing: the range
  // label would be the only thing left, restating a row count the user can
  // already see in full. Drop the whole footer.
  if (!showPageNav && !showPageSize) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        // Matches the existing in-page pagers: hairline top, paper bg
        // (inherited), text-xs muted, py-3 / px-5. Stacks on narrow widths.
        "flex flex-col gap-3 border-t px-5 py-3 text-xs text-muted-foreground",
        // Compact: always stacked + centered for narrow containers (sheets).
        // Default: viewport-based row layout once there's room.
        compact
          ? "items-center px-3"
          : "items-stretch sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <span className="tabular-nums">
        {S.showing(rangeStart, rangeEnd, total)}
        {isFetching ? S.fetchingIndicator : ""}
      </span>

      <div className={cn("flex items-center gap-3", compact && "justify-center")}>
        {showPageNav && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={goPrev}
              aria-label={S.prevPage}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {visiblePages.map((p, idx) =>
              p === ELLIPSIS ? (
                <span
                  key={`gap-${idx}`}
                  className="px-1 text-muted-foreground/60"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  disabled={isFetching}
                  onClick={() => handlePageChange(p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={S.pageAriaLabel(p)}
                  className={cn("cpt-pg-btn", p === page && "active")}
                >
                  {p}
                </button>
              ),
          )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={goNext}
              aria-label={S.nextPage}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {showPageSize && onPageSizeChange && (
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              if (!v) return;
              const next = Number(v);
              if (Number.isFinite(next)) handlePageSizeChange(next);
            }}
          >
            <SelectTrigger
              size="sm"
              // `clearable={false}` opts out of the auto-X — the rows-per-page
              // is a required choice (10/25/50/100), so we want the standard
              // dropdown chevron, not a clear button.
              clearable={false}
              className="h-8 min-w-[64px] gap-1 text-xs"
              aria-label={S.rowsPerPage}
            >
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

