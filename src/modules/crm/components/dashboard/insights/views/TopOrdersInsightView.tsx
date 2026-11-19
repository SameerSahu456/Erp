import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Top Orders drill-down: Summary strip, the full-width paginated ranked
// line-item table as the hero, then the shared revenue-hero + funnel line and
// the standard breakdown tail. Cells are DATA — `INSIGHTS['top-orders'].cells`
// in the registry — so this stays a thin wrapper.
export function TopOrdersInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="top-orders" {...props} />
}
