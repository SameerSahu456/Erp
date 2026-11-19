import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Growth drill-down: the Summary strip, then the scalar current-vs-previous
// stat as the hero, the revenue series beside it, and the period-wise breakdown
// as the growth ledger before the shared tail. Cells are DATA —
// `INSIGHTS.growth.cells` in the registry — so this stays a thin wrapper.
export function GrowthInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="growth" {...props} />
}
