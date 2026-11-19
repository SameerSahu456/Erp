// User-facing copy for the TablePagination component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const TABLE_PAGINATION_STRINGS = {
  // No `noResults` copy: the pager unmounts entirely at total === 0 (see the
  // self-gating note in TablePagination) and the table's own empty state owns
  // that message.
  // Dynamic: `Showing N-M of T`
  showing: (start: number, end: number, total: number) =>
    `Showing ${start}-${end} of ${total}`,
  // Appended while a refetch is in flight.
  fetchingIndicator: " (loading…)",
  prevPage: "Previous page",
  nextPage: "Next page",
  rowsPerPage: "Rows per page",
  // Dynamic: `Page N` for numbered page buttons.
  pageAriaLabel: (page: number) => `Page ${page}`,
} as const
