/**
 * One geometry for every rentals list-toolbar control (2026-10-29): search
 * box, dropdowns, multi-selects and the date range — 32px tall, one width per
 * kind. Rentals-only: the rentals lists render their whole filter bar from
 * `components/shared/filters` (through BusinessMetricsTable's
 * `toolbarFilters[].render`), so nothing outside the module changes.
 */

/** Height, radius and text size of every filter control. */
export const RENTALS_FILTER_CONTROL = "h-8 rounded-[5px] text-[13px]";

/** Width of a dropdown / multi-select filter. Long values truncate with "…"
 *  and show in full on hover. */
export const RENTALS_FILTER_WIDTH = "w-[190px]";

/** Width of the search box — the width Rentals › Accounts' search renders at
 *  (244px, measured). `flex-none` keeps it from growing with the row. */
export const RENTALS_SEARCH_WIDTH = "w-[244px] min-w-0 flex-none";

/** Width of the date-range filter — a full "DD Mon YYYY – DD Mon YYYY". */
export const RENTALS_DATE_RANGE_WIDTH = "w-[248px]";
