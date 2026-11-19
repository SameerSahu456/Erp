export const PAGINATION = {
  // DEFAULT_PAGE_SIZE: 25,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
  // Leads / Deals list view opens on 25 rows (kanban columns keep their own scroll chunk).
  CRM_LIST_DEFAULT_PAGE_SIZE: 10,
  INFINITE_SCROLL_BATCH: 25,
  // Largest single-page size (the top PAGE_SIZE_OPTIONS entry) — used to pull a
  // whole small collection in one request instead of paging (e.g. all devices
  // on a batch, all active warehouses for a picker).
  MAX_PAGE_SIZE: 100,
  // Fallback fetch size for picker / scan feeds whose caller passes no limit —
  // deliberately a fuller first page than a list table's DEFAULT_PAGE_SIZE.
  PICKER_FETCH_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
  // Visible numbered pages in the compact pager's sliding window
  // (see shared/lib/pagination-window.ts).
  WINDOW: 5,
} as const;
