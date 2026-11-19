import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Inactive Accounts drill-down: the Summary strip, the page's headline tiles,
// the ranked inactive list, the win-back plan, then what these accounts used
// to buy (category × OEM, condition, top products) and the revenue hero. Cells
// are DATA — `INSIGHTS['inactive-accounts'].cells` in the registry — so this
// stays a thin wrapper, like every other view here.
export function InactiveAccountsInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="inactive-accounts" {...props} />
}
