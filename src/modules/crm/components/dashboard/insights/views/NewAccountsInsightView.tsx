import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// New Accounts drill-down: the Summary strip, then the five reference cards —
// by period, by vertical, the ranked list for the current window, new vs
// repeat revenue, and what the cohort buys by category × OEM. Cells are DATA
// — `INSIGHTS['new-accounts'].cells` in the registry — so this stays a thin
// wrapper, like every other view here.
export function NewAccountsInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="new-accounts" {...props} />
}
