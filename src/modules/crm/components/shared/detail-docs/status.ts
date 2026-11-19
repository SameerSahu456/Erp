// snake_case / lower-case enum value → Title Case for display, e.g.
// "ready_for_dispatch" → "Ready For Dispatch", "dispatched" → "Dispatched".
// The detail-document tabs pass their own label for the few statuses that
// aren't a plain title-case of the enum (e.g. completed → "Replaced" /
// "Returned"); everything else routes through here so no raw lower-case enum
// ever reaches a badge.
//
// Lives in its own module (not DocList.tsx) so the shared table components
// keep to component-only exports (react-refresh/only-export-components).
export function humanizeStatus(status: string): string {
  return status
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ")
}
