import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Channel vs End Customer — revenue split by `accounts.account_type`.
//
// Thin by design: the cells come from `INSIGHTS['account-type-revenue'].cells`.
// This file exists so the view can grow its own chrome without touching any
// other metric's page.
export function AccountTypeRevenueInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="account-type-revenue" {...props} />
}
