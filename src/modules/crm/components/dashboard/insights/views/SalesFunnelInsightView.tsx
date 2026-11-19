import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Sales Funnel drill-down: Summary strip, the lead & deal conversion card
// full-width as the hero, then the shared revenue-hero + funnel-trends line and
// the standard breakdown tail. Cells are DATA — `INSIGHTS['sales-funnel'].cells`
// in the registry — so this stays a thin wrapper.
export function SalesFunnelInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="sales-funnel" {...props} />
}
