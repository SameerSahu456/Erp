import { DashboardGrid } from '../InsightWidget'
import { InsightCellRenderer } from '../cells/InsightCellRenderer'
import { cellSpec, INSIGHTS, type MetricKey } from '../insights.registry'
import type { InsightViewProps } from './insight-view.types'

// Renders a metric's cells from the REGISTRY — `INSIGHTS[metric].cells` is the
// list, this just walks it. Every metric view delegates here, so "what is on
// this page" stays a data question and no view hardcodes a cell in JSX.
export function InsightCellGrid({ metric, ...ctx }: InsightViewProps & { metric: MetricKey }) {
  return (
    <DashboardGrid>
      {INSIGHTS[metric].cells.map((spec, i) => {
        // `span` / `title` / `why` are the VIEW's overrides — the same cell
        // reads differently on a dashboard tile and on its own page.
        const { cell, span, title, why } = cellSpec(spec)
        return (
          <InsightCellRenderer
            // Index-qualified: a cell kind can repeat in one view (two
            // `spacer`s), and a bare `key={cell}` would collide.
            key={`${cell}-${i}`}
            cell={cell}
            span={span}
            title={title}
            why={why}
            {...ctx}
          />
        )
      })}
    </DashboardGrid>
  )
}
