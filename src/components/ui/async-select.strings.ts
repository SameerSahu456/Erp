/** Default copy for `<AsyncSelect>` (§16.12). Every value can be overridden
 *  per call site through the matching prop. */
export const ASYNC_SELECT_STRINGS = {
  placeholder: "Select...",
  searchPlaceholder: "Search...",
  loading: "Loading…",
  loadFailed: "Failed to load options",
  noMatches: "No matches",
  noOptions: "No options",
  loadingMore: "Loading more…",
  scrollForMore: "Scroll for more",
} as const
