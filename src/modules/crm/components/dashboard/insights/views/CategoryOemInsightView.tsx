import { InsightCellGrid } from './InsightCellGrid'
import type { InsightViewProps } from './insight-view.types'

// Category & OEM — the two product-side breakdowns on one page, because
// they answer the same question sliced two ways and are read together.
//
// Thin by design: the cells come from `INSIGHTS['category-oem'].cells`. This file
// exists so the view can grow its own chrome (a KPI strip, an export bar, a
// bespoke layout) without touching any other metric's page.
export function CategoryOemInsightView(props: InsightViewProps) {
  return <InsightCellGrid metric="category-oem" {...props} />
}
