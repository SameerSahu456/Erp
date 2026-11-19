export const UI = {
  DEBOUNCE_SEARCH_MS: 300,
  // List search boxes cap at the backend `q` limit (every list endpoint declares
  // Query(alias="q", max_length=255)); capping here avoids a 422 on a long paste
  // (§1.1.E — search "length-capped to the backend's limit").
  SEARCH_MAX_LENGTH: 255,
  // Filter / picker search boxes (toolbar search + dropdown searches) cap tighter
  // than the list `q` limit — no realistic filter term needs more.
  FILTER_SEARCH_MAX_LENGTH: 100,
  DEBOUNCE_RESIZE_MS: 150,
  TOAST_DURATION_MS: 4000,
  BREAKPOINTS: { SM: 640, MD: 768, LG: 1024, XL: 1280, XXL: 1536 },
  ANIMATION_DURATION_MS: 200,
  // How many characters `ExpandableText` reveals per "Show more" step (and the
  // initial visible slice). Single source so every progressive-reveal surface
  // (notes, comments, …) uses the same threshold.
  TEXT_REVEAL_CHUNK_SIZE: 500,
  // Character budget before long rich-text content (activity-log details and
  // audit diff values) is clamped behind a "Show more" toggle that reveals all.
  RICH_TEXT_CLAMP_LIMIT: 600,
} as const;

/** The one placeholder for a missing value in a cell or fact (§6.9). */
export const EMPTY_VALUE = "—";
