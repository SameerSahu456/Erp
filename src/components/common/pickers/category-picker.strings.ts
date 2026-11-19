// User-facing copy for the CategoryPicker and CategoryMultiPicker components.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const CATEGORY_PICKER_STRINGS = {
  trigger: {
    loading: "Loading…",
  },
  search: {
    placeholder: "Search categories...",
    clearAriaLabel: "Clear search",
    // Dynamic: `No matches for "<query>".`
    noMatches: (query: string) => `No matches for "${query}".`,
    noCategories: "No categories yet.",
  },
  // "All categories" entry at the top of the picker when `allowAll` is set.
  allCategories: "All categories",
  // The "All / <parent>" row header inside a subcategory submenu.
  allSubLabel: "All",
  // Clear trigger buttons.
  clearSelection: "Clear selection",
  removeChip: (name: string) => `Remove ${name}`,
  clearAll: "Clear all",
  // Multi-picker footer.
  footer: {
    // Dynamic: `N selected`
    selected: (count: number) => `${count} selected`,
    clearAll: "Clear all",
  },
  // Tooltip on a row that's locked because its parent is already selected.
  coveredByParent: "Covered by the selected parent category",
  // Trigger loading state while edit-mode labels are resolved.
  triggerLoading: "Loading…",
} as const
