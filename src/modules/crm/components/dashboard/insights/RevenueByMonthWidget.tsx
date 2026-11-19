import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

// Restore alongside the commented-out export button below:
// import { Download } from 'lucide-react'
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import type { RevenueParams } from '../../../api/dashboard'
import { INSIGHTS_STRINGS } from './insights.strings'
import type { Span } from './InsightWidget'
import { RevenueTrendWidget } from './RevenueTrendWidget'

// Revenue per period on the CRM dashboard — live on `GET /crm/dashboard/revenue`.
//
// The dashboard's framing of the shared live series: its own title/why copy and
// the Details link. The series itself — query, states, window footnote — lives
// in `RevenueTrendWidget`, which the inner view's Revenue Trend cell and the
// Revenue hero also render, so all three can't drift.
//
// Still a LIST, not a chart. The reference renders a Recharts line and flips to
// a list when the global chart/table toggle is set to table; chart view is still
// disabled, so the chart branch belongs with the work that enables the toggle,
// not with wiring the API.
//
// Shows the FIRST 10 buckets, like the Sales Team tile shows its top 10 — a
// weekly period runs to ~60 buckets, which turns a scannable tile into a wall.
// The cap is a `page_size` on the query, not a `.slice()` of a cached series
// (§16.7), and "Show all N →" hands the rest to the inner view's pager.

/** How many buckets the tile shows before deferring to "Show all N →". */
const REVENUE_BUCKETS = 18

interface RevenueByMonthWidgetProps {
  /** Page-level slice — period, range and the toolbar facets. */
  params: RevenueParams
  span?: Span
  detailHref: string
}

export function RevenueByMonthWidget({ params, span = 4, detailHref }: RevenueByMonthWidgetProps) {
  return (
    <RevenueTrendWidget
      params={params}
      // Period-keyed: the API buckets by the toolbar's period (weekly → 36
      // "Jan W1" buckets, yearly → one "2026"), so a fixed "Revenue by Month"
      // header described only one of the four settings.
      title={(bucketPeriod) => INSIGHTS_STRINGS.revenueByMonth.title[bucketPeriod]}
      why={INSIGHTS_STRINGS.revenueByMonth.why}
      span={span}
      detailHref={detailHref}
      limit={REVENUE_BUCKETS}
      breakdown
      // Dashboard-only height tuning: full list + this gap = Sales Team's
      // card height, so the hero pair reads level. The insight detail page
      // renders its own trend cells without this.
      footerGap="pt-4"
      // Not a client-side expand: the rest of the series lives behind the inner
      // view's server pagination — same wording and behaviour as Sales Team's.
      renderShowAll={(total) => (
        <Button
          render={<Link to={detailHref} />}
          variant="link"
          size="xs"
          className="mt-1.5 h-auto p-0"
        >
          {INSIGHTS_STRINGS.revenueByMonth.showAll(total)}
        </Button>
      )}
      // Details button — REMOVED (product call): the whole card drills through
      // on click, and "Show all N →" below already names that affordance, so
      // the header link was redundant chrome.
      // Export button — COMMENTED OUT. Nothing generates the file yet, so it
      // only ever rendered disabled: a button that cannot do anything reads as
      // broken rather than as a promise. Restore this (and its imports at the
      // top) when the server-side export lands.
      //
      // actions={
      //   <TooltipProvider delay={150}>
      //     <Tooltip>
      //       <TooltipTrigger
      //         render={
      //           <Button
      //             variant="outline"
      //             size="icon-sm"
      //             disabled
      //             aria-label={INSIGHTS_STRINGS.toolbar.export}
      //           />
      //         }
      //       >
      //         <Download className="size-3.5" />
      //       </TooltipTrigger>
      //       <TooltipContent>{INSIGHTS_STRINGS.toolbar.exportDisabled}</TooltipContent>
      //     </Tooltip>
      //   </TooltipProvider>
      // }
    />
  )
}
