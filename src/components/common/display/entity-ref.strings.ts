// Copy for the EntityRef identifier control (single-click opens the detail
// page, double-click copies the value).
export const ENTITY_REF_STRINGS = {
  hint: "Click to open · double-click to copy",
  // No access to the target: a click explains why it won't open (no redirect);
  // a double click still copies.
  noAccessHint: "No access · double-click to copy",
  noAccess: "You don't have permission to view this record.",
  copied: "Copied to clipboard",
  copyFailed: "Couldn’t copy",
} as const
