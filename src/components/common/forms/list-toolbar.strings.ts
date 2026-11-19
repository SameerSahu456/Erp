// User-facing copy for the ListToolbar component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const LIST_TOOLBAR_STRINGS = {
  // View-toggle buttons.
  listView: {
    ariaLabel: "List view",
    label: "List View",
  },
  kanbanView: {
    ariaLabel: "Kanban board",
    label: "Kanban Board",
  },
  // View-switcher group accessible label.
  viewMode: "View mode",
  // Search field.
  clearSearch: "Clear search",
  // Filter button label — base and with active-count suffix.
  filter: "Filter",
  // Dynamic: `Filter (N)` when N > 0.
  filterWithCount: (count: number) => `Filter (${count})`,
} as const
