export const numberFmt = new Intl.NumberFormat("en-IN");

// Stable empties for reusing CategoryNode (the Categories list row) in the
// flat subcategory table — these children are leaves (2-level catalogue), so
// there is nothing to expand.
const NO_EXPANDED = new Set<string>();
const noopToggle = () => {};

export { NO_EXPANDED, noopToggle };
