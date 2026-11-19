import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Revenue by Account — accounts ranked by closed value.
//
// Thin by design: the cells come from `INSIGHTS['account-revenue'].cells`. This file
// exists so the view can grow its own chrome (a KPI strip, an export bar, a
// bespoke layout) without touching any other metric's page.
export function AccountRevenueInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="account-revenue" {...props} />
}
