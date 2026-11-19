import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Average Order Value drill-down: Summary strip, then the AOV-by-Period trend
// (the same `RevenueTrendWidget` as Revenue Trend, `metric: 'avg_order_value'`).
// Cells are DATA — `INSIGHTS['avg-order-value'].cells` in the registry.
export function AvgOrderValueInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="avg-order-value" {...props} />
}
