import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Revenue by Condition — the New / Refurbished / New Pull share donut.
//
// Thin by design: the cells come from `INSIGHTS['condition-revenue'].cells`. This file
// exists so the view can grow its own chrome (a KPI strip, an export bar, a
// bespoke layout) without touching any other metric's page.
export function ConditionRevenueInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="condition-revenue" {...props} />
}
