import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Account Movement drill-down. Composes from `INSIGHTS['account-movement'].cells`
// in the registry — same thin-wrapper pattern as every other inner view.
//
// Cells rendered here (Phase 2 MVP):
//   * Summary strip (shared)
//   * Account Movement — 4-tile summary (growing count / declining count /
//     net movement / biggest mover)
//   * Top Growing Customers ranking card
//   * Top Declining Customers ranking card
//   * Shared breakdown tail (Accounts / Category / OEM / Condition / Top Products)
//
// Deferred to follow-up (see service docstring):
//   * Movement Mix donut, All Accounts paginated table (uses `movement=all`),
//     Growing vs Declining Cohort Revenue (needs new backend endpoint).
export function AccountMovementInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="account-movement" {...props} />
}
