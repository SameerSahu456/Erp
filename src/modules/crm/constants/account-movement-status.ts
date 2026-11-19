import type { AccountMovementStatus } from "../api/dashboard"

/** Display label per movement status. Centralised per Coding-guideline §16.12
 *  (no naked strings in components) + mirrored across the dashboard tile and
 *  the (upcoming) drill-down page so a status is never spelled two ways. */
export const ACCOUNT_MOVEMENT_STATUS_LABEL: Record<AccountMovementStatus, string> = {
  growing: "Growing",
  declining: "Declining",
  new: "New",
  lapsed: "Lapsed",
  flat: "Flat",
}

/** Row-bucket semantic for the two primary tile columns. `growing` holds
 *  `growing` + `new` rows; `declining` holds `declining` + `lapsed`. `flat`
 *  rows never enter either bucket — they're excluded from the top-N lists
 *  and only counted in `summary.flat_count` + the Movement Mix donut. */
export const ACCOUNT_MOVEMENT_BUCKET: Record<AccountMovementStatus, "growing" | "declining" | null> =
  {
    growing: "growing",
    new: "growing",
    declining: "declining",
    lapsed: "declining",
    flat: null,
  }
