import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Sales Team — the rep leaderboard plus the revenue trend beside it.
//
// Thin by design: the cells come from `INSIGHTS['sales-team'].cells`. This file
// exists so the view can grow its own chrome (a KPI strip, an export bar, a
// bespoke layout) without touching any other metric's page.
export function SalesTeamInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="sales-team" {...props} />
}
