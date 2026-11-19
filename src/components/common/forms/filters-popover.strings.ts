// Copy for the shared FiltersPopover (Coding-guideline §16.12). Generic,
// app-wide labels — a page passes its own overrides when it needs to.
export const FILTERS_POPOVER_STRINGS = {
  trigger: "Filters",
  title: "Filters",
  clearAll: "Clear all",
  activeCountAria: (n: number) => `${n} active filter${n === 1 ? "" : "s"}`,
} as const
